# 自有服务器部署

这是源代码发布包，不含数据库数据、附件、密码或构建产物。服务器需安装 Docker Engine 和 Docker Compose v2，并能拉取 Node、PostgreSQL、MinIO、ClamAV 镜像。首次启动在服务器上构建应用镜像。

## 域名与 HTTPS

准备两个指向服务器的域名，例如 app.example.com（应用）和 files.example.com（附件）。在已有的 HTTPS 反向代理中，分别转发至 127.0.0.1:3000 和 127.0.0.1:9000。两个站点都要有有效 TLS 证书。附件站点直接代理 MinIO S3 API，保留原始 Host、路径、查询参数和请求头，不做路径重写或缓存。应用容器与浏览器都需要能访问附件域名；如果服务器无法访问自身的公网域名，需要先处理 DNS/网络回环。

公网只开放 HTTPS（通常 TCP 443）和受限运维入口。应用、数据库、MinIO、ClamAV 不直接暴露公网。修改绑定端口时，同步调整反向代理及健康检查地址。若已有外部对象存储或数据库，可参考仓库 docker-compose.yml 自行配置；以下命令使用随包的一体化 docker-compose.release.yml。

## 配置并启动

解压后进入包内目录，创建仅自己可读的环境文件：

    cp deploy.env.example .env.deploy
    chmod 600 .env.deploy
    openssl rand -hex 32

编辑 .env.deploy，替换示例域名和所有 CHANGE_ME。分别为 BETTER_AUTH_SECRET、POSTGRES_PASSWORD、S3_SECRET_ACCESS_KEY、ATTACHMENT_SCANNER_TOKEN 生成不同的随机值；数据库密码使用十六进制字符，以免拼入数据库 URL 时出现特殊字符。不要上传环境文件或发到聊天记录。

    docker compose --env-file .env.deploy -f docker-compose.release.yml config --quiet
    docker compose --env-file .env.deploy -f docker-compose.release.yml build app tools
    docker compose --env-file .env.deploy -f docker-compose.release.yml up -d db minio minio-init clamav
    docker compose --env-file .env.deploy -f docker-compose.release.yml --profile tools run --rm tools npm run db:migrate
    docker compose --env-file .env.deploy -f docker-compose.release.yml up -d app
    curl -fsS http://127.0.0.1:3000/api/health

ClamAV 首次下载病毒库可能需要几分钟；依赖健康后才能迁移。健康检查应返回 status: ready，database、storage、scanner 均为 ready。随后检查两个 HTTPS 域名，实际测试登录、附件上传和下载。

首次初始化管理员时，在服务器本地创建 bootstrap-admin.json，只允许自己读取。用户名为 3–30 位小写字母、数字、下划线或点；密码至少 12 位。内容示例（必须换成随机强密码）：

    {"organizationName":"公司名称","name":"管理员","username":"admin","password":"换成随机强密码"}

    chmod 600 bootstrap-admin.json
    docker compose --env-file .env.deploy -f docker-compose.release.yml --profile tools run --rm -T tools npm run admin:bootstrap < bootstrap-admin.json

成功后安全删除一次性 JSON。访问 BETTER_AUTH_URL 中设置的地址登录。

## 更新与数据

数据在三个 Docker 命名卷中（PostgreSQL、MinIO、ClamAV）；ZIP 不包含数据。更新前备份数据库和对象存储，并验证备份可恢复。保留旧版代码包；在新包目录使用同一环境配置和 Compose 项目名 weekly-report，重新构建、迁移并启动。数据库迁移可能不可逆，先在测试环境演练。生产定时任务需由服务器另行调度，tools profile 不会自行定时运行。

查看状态和日志：

    docker compose --env-file .env.deploy -f docker-compose.release.yml ps
    docker compose --env-file .env.deploy -f docker-compose.release.yml logs --tail=200 app

停止容器可运行 docker compose --env-file .env.deploy -f docker-compose.release.yml down。不要加 -v，否则会删除数据卷。更多运行与备份说明见 OPERATIONS.md。
