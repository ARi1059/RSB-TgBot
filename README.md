# RSB Telegram Bot

一个用于媒体资源管理的 Telegram Bot，支持以 file_id 形式存储和分享媒体合集。

## 功能特性

- 📤 媒体文件上传与管理（图片、视频、文档、音频）
- 🔗 深链接分享合集
- 🎯 基于 unique_file_id 的自动去重
- 👥 管理员权限控制
- 📢 全员消息推送
- 🤖 自动搬运功能（Userbot）
- 🔄 **多 Session 账号池**（自动切换、断点续传）
- 💾 PostgreSQL 数据持久化

## ⭐ 新功能：多 Session 账号管理

支持使用多个 Telegram UserBot Session 账号来完成大批量搬运工作：

- ✅ **账号池管理**：添加、删除、启用/禁用多个 session 账号
- ✅ **自动切换**：账号被限流时自动切换到下一个可用账号
- ✅ **断点续传**：从限流处继续搬运，不丢失进度
- ✅ **Bot 内管理**：直接在 Bot 中登录和管理账号
- ✅ **智能调度**：按优先级和使用频率自动选择最佳账号
- ✅ **统计监控**：实时查看账号状态、转发统计、限流信息

**📚 完整文档导航：** [MULTI_SESSION_README.md](./MULTI_SESSION_README.md) - 完整文档索引

**🚀 快速入口：**
- **新手入门** → [QUICK_START.md](./QUICK_START.md) - 5 分钟快速上手
- **快速配置** → [MULTI_SESSION_QUICK_CONFIG.md](./MULTI_SESSION_QUICK_CONFIG.md) - 3 种方案配置
- **实战教程** → [MULTI_SESSION_TUTORIAL.md](./MULTI_SESSION_TUTORIAL.md) - 手把手操作
- **配置示例** → [.env.multi-session.example](./.env.multi-session.example) - 详细配置
- **常见问题** → [MULTI_SESSION_FAQ.md](./MULTI_SESSION_FAQ.md) - 35 个问题解答

**📖 更多文档：**
- [配置迁移指南](./MULTI_SESSION_MIGRATION.md) - 从单 Session 升级
- [功能详细指南](./MULTI_SESSION_GUIDE.md) - 完整功能说明
- [最佳实践](./MULTI_SESSION_BEST_PRACTICES.md) - 优化和技巧
- [数据库示例](./MULTI_SESSION_DATABASE_EXAMPLES.md) - SQL 操作示例

## 技术栈

- **Bot 框架**: grammY + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **Userbot**: GramJS
- **部署**: Docker + Docker Compose

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd RSB-TgBot
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
BOT_TOKEN=your_bot_token_here
ADMIN_IDS=123456789,987654321
DATABASE_URL=postgresql://user:password@localhost:5432/rsb_tgbot
BOT_USERNAME=your_bot_username
```

### 4. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. 启动 Bot

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## Docker 部署

使用 Docker Compose 一键部署：

```bash
docker-compose up -d
```

## 项目结构

```
RSB-TgBot/
├── src/
│   ├── bot/              # Bot 主逻辑
│   │   ├── commands/     # 命令处理器
│   │   ├── conversations/# 多步骤会话
│   │   ├── middlewares/  # 中间件
│   │   └── handlers/     # 事件处理器
│   ├── userbot/          # Userbot 自动搬运
│   ├── database/         # 数据库连接
│   ├── services/         # 业务逻辑服务
│   └── utils/            # 工具函数
├── prisma/               # Prisma schema
└── docker-compose.yml    # Docker 配置
```

## 主要命令

### 管理员命令

- `/start` - 启动 Bot / 访问深链合集
- `/upload` - 上传媒体文件
- `/display` - 查看所有合集
- `/publish` - 全员推送消息
- `/transfer` - 搬运频道内容
- `/session` - **Session 账号管理**（新功能）

### 用户命令

- `/start <token>` - 访问指定合集

## 开发指南

### 数据库迁移

```bash
# 创建新迁移
npm run prisma:migrate

# 查看数据库
npm run prisma:studio
```

### 添加新功能

1. 在 `src/bot/commands/` 创建命令处理器
2. 在 `src/services/` 添加业务逻辑
3. 在 `src/bot/index.ts` 注册命令

## 许可证

MIT
