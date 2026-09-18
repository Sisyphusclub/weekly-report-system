# 周报系统运行手册

## 环境要求

- Node.js 与 npm 版本按 `package.json` 及锁文件安装。
- PostgreSQL 由部署环境提供，使用 `DATABASE_URL` 注入；不要把密码写入仓库。
- 生产环境必须配置认证密钥、应用地址和对象存储相关环境变量。启动前运行 `npm run build`。
- `.env.example` 仅是字段模板，所有尖括号占位符和空值都必须由部署系统注入；它不包含可用的默认账号或密码。

部署前运行 `npm run config:check` 检查必需配置；命令只输出缺少的字段名，不输出密钥值。

## 本地开发环境

本机没有 PostgreSQL 时，使用仓库内的开发 Compose 栈。它包含 PostgreSQL、MinIO（S3 兼容对象存储）、MinIO 自动建桶任务和 ClamAV；ClamAV 只通过本机端口提供给本地应用，MinIO 存储桶默认设为私有。

```powershell
npm run dev:env
npm run dev:infra:up
npm run db:migrate
npm run calendar:seed
npm run dev
```

首次初始化管理员时，不要把密码放在命令行参数中。将一次性 JSON 通过标准输入传给 `npm run admin:bootstrap`，然后在登录页修改临时密码并绑定 TOTP。开发服务可通过 `GET http://localhost:3000/api/health` 检查，必须同时看到 `database`、`storage` 和 `scanner` 为 `ready`。

```powershell
npm run dev:infra:logs
npm run dev:infra:down
```

`npm run dev:env` 会在项目根目录生成随机 `.env.local`；该文件被 Git 忽略，不能提交或复制到预发布/生产环境。MinIO 控制台地址是 `http://localhost:9001`，仅用于本地开发。

## 部署

1. 拉取目标 Git 提交，并执行 `npm ci`。
2. 配置生产环境变量，确认开发配置没有被带入生产。
3. 执行 `npm run db:migrate`，再执行 `npm run build`。
4. 使用 `npm run start` 启动应用，并检查 `GET /api/health` 返回 `ready`。
5. 使用进程管理器托管服务；将 `scripts/run-scheduled-jobs.ps1` 接入计划任务，并设置提醒任务所需的组织环境变量。

发布前可运行 `npm run verify`，一次执行类型、Lint、格式、单元测试、迁移检查和生产构建门禁。具备浏览器测试环境时运行 `npm run verify:e2e`，在核心门禁后追加 Playwright 测试。

## 回滚

1. 停止当前进程并记录当前提交、迁移版本和错误日志。
2. 切换到已验证的上一 Git 提交，执行 `npm ci` 和 `npm run build`。
3. 只有存在对应的、已验证的回滚迁移时才回退数据库；禁止直接删除生产表或手工改数据。
4. 重新启动后检查 `/api/health`，并验证登录、报告读取和通知中心。

## 备份与恢复

创建备份并生成 SHA-256 校验文件：

```powershell
./scripts/backup-db.ps1 -OutputDirectory .\backups
```

检查备份新鲜度和完整性：

```powershell
npm run backup:check -- -BackupDirectory .\backups
```

恢复前必须确认目标数据库和备份文件，恢复会覆盖目标数据库：

```powershell
./scripts/restore-db.ps1 -InputFile .\backups\weekly-YYYYMMDD-HHmmss.dump -Confirm
```

恢复应在隔离数据库执行并记录结果。仓库脚本不会替代服务器外备份、保留策略或恢复演练。

## 初始管理员

### 本地恢复验收

开发容器运行且 `weekly` 已完成迁移后，在仓库根目录执行：

```powershell
./scripts/test-restore.ps1
# 当前终端尚未刷新 Docker 的 PATH 时：
./scripts/test-restore.ps1 -DockerCommand 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
```

该命令固定连接本项目开发容器，创建随机命名的源库和恢复库，验证备份校验和、中文数据、表清单、迁移记录及恢复后的数据库业务约束。业务测试使用 `.env.local` 中的开发数据库密码，通过 `127.0.0.1:55432` 连接恢复库。演练结束后删除本次临时数据库和归档，不覆盖业务数据库。

这项检查不替代生产备份、异地存储或恢复时间验收。

### 创建管理员

在空数据库中准备一次性 JSON，通过标准输入执行：

```powershell
Get-Content .\bootstrap-admin.json -Raw | npm run admin:bootstrap
```

初始化成功后立即修改密码并完成 TOTP。JSON 和密码不得提交到 Git、日志或聊天记录中。

## 日常任务

可将以下入口接入计划任务：

- `npm run reminders:run`
- `npm run weekly:drafts`
- `npm run login-audit:cleanup`
- `npm run attachments:cleanup`
- `scripts/run-scheduled-jobs.ps1`

设置 `BACKUP_DIRECTORY` 后，统一调度入口还会检查最近备份的新鲜度和校验和；未设置时会明确跳过该检查。

任务失败时检查数据库、对象存储和环境变量配置；不要忽略非零退出码。
