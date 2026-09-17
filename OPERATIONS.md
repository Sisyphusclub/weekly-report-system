# 部署与运维

## 环境变量

复制 `.env.example` 到部署环境的受管密钥位置，补齐数据库密码、至少 32 个字符的 `BETTER_AUTH_SECRET` 和正式 HTTPS 地址。生产环境只通过环境变量注入密钥。

附件存储需要配置 `S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY_ID` 和 `S3_SECRET_ACCESS_KEY`。系统使用私有 S3 兼容桶，通过 10 分钟预签名 URL 上传和下载；允许图片、PDF、纯文本，单文件上限 10 MB。生产环境应为应用账号授予目标桶的最小读写权限，禁止公开桶策略。

## 首次部署

1. 准备独立 production 环境变量，并确认域名、HTTPS 和反向代理。
2. 执行 `docker compose build`。
   Compose 不内置对象存储；启动前应准备可访问的私有 S3 兼容桶，并设置上述 `S3_*` 变量。
3. 执行 `docker compose up -d db`，等待数据库健康检查通过。
4. 执行 `docker compose run --rm app npm run db:migrate`。
5. 通过受保护 stdin 执行 `npm run admin:bootstrap` 创建首个管理员，不要把密码写入命令行历史。
6. 执行 `docker compose up -d app`。
7. 检查 `GET /api/health` 和登录流程。

## 后台任务

由外部 cron、CI 或任务平台调用，并传入 `REMINDER_ORGANIZATION_ID`：`npm run reminders:run`、`npm run weekly:drafts`。任务可重复执行，通知使用唯一键去重，周报草稿只在不存在时创建。

## 备份与恢复

PowerShell 执行 `scripts/backup-db.ps1 -OutputDirectory D:\backups\weekly`，并将备份复制到服务器之外，保留至少 30 天。恢复前停止应用并确认目标数据库，执行 `scripts/restore-db.ps1 -InputFile <备份文件> -Confirm`，随后重新运行迁移和关键登录/提交检查。恢复演练应在隔离数据库进行并留存记录。

## 发布与回滚

每次发布使用明确 Git 提交构建不可变镜像；发布前备份并评估迁移。应用异常时回滚镜像，不自动执行破坏性数据库降级。

本地没有真实服务器、域名、证书或备份目标时，不得声称已经完成公网部署或恢复演练。

# 迁移执行约束

数据库迁移由 `npm run db:migrate` 按 Drizzle journal 顺序执行。不要直接重复运行已标记完成的 SQL，也不要修改已经在任一环境执行过的迁移文件；线上修复必须新增迁移并先在预发布数据库演练。
