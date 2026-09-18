# 部署与运维

## 环境变量

复制 `.env.example` 到部署环境的受管密钥位置，补齐数据库密码、至少 32 个字符的 `BETTER_AUTH_SECRET` 和正式 HTTPS 地址。生产环境只通过环境变量注入密钥。

附件存储需要配置 `S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY_ID` 和 `S3_SECRET_ACCESS_KEY`。系统使用支持 S3 checksum API 的私有兼容桶，通过 10 分钟预签名 URL 上传和下载；允许图片、PDF、纯文本，单文件上限 10 MB。生产环境应为应用账号授予目标桶的最小读写权限，禁止公开桶策略。

预发布和生产环境必须接入企业恶意文件扫描：配置 `ATTACHMENT_SCANNER_URL`，可选配置 `ATTACHMENT_SCANNER_TOKEN`。附件确认时系统向该地址发送 JSON（包含对象键、文件名、类型、大小、SHA-256 和 10 分钟私有下载地址），扫描服务必须返回 JSON `{ "clean": true }`；超时、非 2xx、响应格式不符或返回 `clean: false` 都会拒绝确认。失败附件保持未验证状态，不提供下载，可重试确认；超过 1 小时仍未确认的附件由清理任务删除。已验证附件的授权重复确认直接返回成功。开发环境未配置扫描地址时不会伪造扫描结果，系统仅执行类型、魔数和哈希校验；扫描服务应限制网络访问范围，且不得返回重定向。

## 首次部署

1. 准备独立 production 环境变量，并确认域名、HTTPS 和反向代理。
2. 执行 `docker compose --profile tools build`，同时构建应用和运维镜像。
   Compose 不内置对象存储；启动前应准备可访问的私有 S3 兼容桶，并设置上述 `S3_*` 变量。
   预发布和生产还必须设置 `ATTACHMENT_SCANNER_URL`，否则应用不会启动。
3. 执行 `docker compose up -d db`，等待数据库健康检查通过。
4. 执行 `docker compose run --rm tools npm run db:migrate`。
5. 通过受保护 stdin 执行 `docker compose run --rm -T tools npm run admin:bootstrap` 创建首个管理员，不要把密码写入命令行历史。
6. 执行 `docker compose up -d app`。
7. 检查 `GET /api/health` 和登录流程。

## 账号停用与任务交接

管理员可在“任务数据”页选择原负责人和接收人，填写原因并确认数量后批量转交任务。原账号可为停用状态；接收人必须是本组织已启用的员工或老板账号。每批最多 200 条，仅包含待开始、进行中、阻塞任务，超过时可在刷新后继续下一批。转交会递增任务版本、逐条记录原负责人/接收人/原因，并通知接收人；已完成与已取消任务、历史报告署名和报告快照保持不变。数量发生变化时需刷新后重新确认，网络结果不确定时先核对再操作。

## TOTP 恢复

账号丢失认证设备且无恢复码时，服务器运维人员核实身份后，通过受保护 stdin 向 `npm run security:reset-totp` 输入 JSON；容器中使用 `docker compose run --rm -T tools npm run security:reset-totp`。需先执行新增迁移。输入字段为 `organizationId`、`operatorUsername`（同组织未停用的管理员审计账号）、`targetUsername`、`reason`（10–500 字符）以及固定确认值 `confirm: "RESET_TOTP"`。不要在原因中填写密码、TOTP 密钥或恢复码。

此命令的权限来自服务器控制台和数据库访问权，输入的操作人账号用于归属审计，不替代运维人员身份核验。它在同一事务中删除目标 TOTP 密钥与恢复码、撤销全部会话、要求修改密码，并写入含操作人与原因的 `OPS_TOTP_RESET` 审计。停用账号不会被启用；老板和管理员必须重新绑定 TOTP 才可进入业务页面，员工仍遵循可选绑定规则。命令不生成密码、不打印密钥，也不提供网页调用入口。数据库权限应仅授予受信任运维人员。

## 后台任务

Excel 导入在独立 Node.js 子进程中解析，不继承应用密钥。每个应用进程最多同时运行 2 个解析任务，单次限时 15 秒，V8 老生代堆上限 128 MB；超时或子进程异常退出会拒绝导入。上传文件上限 10 MB，任务上限 200 条、工作表列数上限 32。V8 堆限制不覆盖 Buffer 等原生内存，部署时仍需根据应用和子进程的实测峰值设置容器总内存限制。解析脚本随 standalone 构建产物发布。

由外部 cron、CI 或任务平台调用，并传入 `REMINDER_ORGANIZATION_ID`：`npm run reminders:run`、`npm run weekly:drafts`、`npm run attachments:cleanup`。任务可重复执行，通知使用唯一键去重，周报草稿只在不存在时创建；附件清理任务删除超过 1 小时仍未完成确认的对象和元数据。

容器部署使用 `docker compose run --rm -T tools npm run <任务名>` 执行上述任务，工作日历导入使用 `calendar:seed`。`tools` 镜像包含 TypeScript 执行器、脚本和迁移目录，以非 root 用户运行；它没有端口映射，通过 profile 排除在常规服务启动之外。应用的 standalone 镜像仅用于提供 Web 服务，不包含运维执行环境。

## 备份与恢复

PowerShell 执行 `scripts/backup-db.ps1 -OutputDirectory D:\backups\weekly`，脚本会同时生成 SHA-256 sidecar 文件；将 dump 和 sidecar 一起复制到服务器之外，保留至少 30 天。恢复前停止应用并确认目标数据库，执行 `scripts/restore-db.ps1 -InputFile <备份文件> -Confirm`，脚本会在 sidecar 存在时校验完整性，随后重新运行迁移和关键登录/提交检查。恢复演练应在隔离数据库进行并留存记录。

## 发布与回滚

备份和恢复脚本会检查 PostgreSQL 客户端退出码，失败时终止并返回错误。恢复使用单个事务并在首个 SQL 错误处停止，防止部分恢复被误报为成功。可执行 `pwsh -NoProfile -File scripts/test-backup-restore.ps1` 检查脚本失败处理；此隔离测试使用替代命令，不代表真实数据库恢复演练通过。

合并到 `main` 或 `master` 前必须通过仓库 CI：依赖安装、类型检查、Lint、全量测试、生产构建和 high 级依赖审计。moderate 级依赖问题需在升级前评估兼容性，不使用 `npm audit fix --force` 绕过审查。

每次发布使用明确 Git 提交构建不可变镜像；发布前备份并评估迁移。应用异常时回滚镜像，不自动执行破坏性数据库降级。

本地没有真实服务器、域名、证书或备份目标时，不得声称已经完成公网部署或恢复演练。

# 迁移执行约束

数据库集成测试还覆盖报告版本和审计记录的 UPDATE/DELETE 拒绝、同一员工同日报告唯一性、通知去重及事务回滚。不可变历史的测试记录只写入未提交事务，测试结束回滚，不关闭保护触发器。该测试不执行 TRUNCATE，也不清空已有业务表。

CI 的 `database` 作业使用独立 PostgreSQL 16 服务执行 `npm run test:database`，检查全量迁移、重复迁移、schema 列可读性、组织外键隔离及两个连接竞争同一任务版本。手动运行时必须显式设置 `TEST_DATABASE_URL`，数据库名称须以 `_test` 结尾，禁止使用生产数据库；脚本不读取应用的 `DATABASE_URL`，只清理本次生成的 UUID 测试记录。新增工作流不代表测试已经执行通过，发布时应查看该作业的实际结果。

数据库迁移由 `npm run db:migrate` 按 Drizzle journal 顺序执行。不要直接重复运行已标记完成的 SQL，也不要修改已经在任一环境执行过的迁移文件；线上修复必须新增迁移并先在预发布数据库演练。
当前历史迁移包含人工登记的增量 SQL，生成器快照并不覆盖全部历史版本；不要直接提交自动生成的全量校正迁移。修改 schema 后应人工编写下一条幂等 SQL、登记 journal，并在隔离数据库验证升级路径。
