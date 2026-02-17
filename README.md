# RSB Telegram Bot

一个用于媒体资源管理的 Telegram Bot，支持以 file_id 形式存储和分享媒体合集。

## 功能特性

- 📤 媒体文件上传与管理（图片、视频、文档、音频）
- 🔗 深链接分享合集
- 🎯 基于 unique_file_id 的自动去重
- 👥 管理员权限控制
- 📢 全员消息推送
- 🤖 自动搬运功能（Userbot）
- 💾 PostgreSQL 数据持久化

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
