# 数据库迁移说明

## 迁移内容

本次迁移添加了多 Session 账号管理功能，包括：

1. 新增 `userbot_sessions` 表
2. 在 `transfer_tasks` 表中添加 `current_session_id` 字段

## 迁移步骤

### 1. 确保环境变量配置正确

在 `.env` 文件中确认 `DATABASE_URL` 已配置：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### 2. 运行迁移命令

```bash
npx prisma migrate dev --name add_session_pool
```

### 3. 生成 Prisma Client

```bash
npx prisma generate
```

### 4. 重启应用

```bash
npm run dev
# 或
npm start
```

## 手动迁移 SQL（如果需要）

如果自动迁移失败，可以手动执行以下 SQL：

```sql
-- 添加 userbot_sessions 表
CREATE TABLE "userbot_sessions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "api_id" INTEGER NOT NULL,
    "api_hash" TEXT NOT NULL,
    "session_string" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "flood_wait_until" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "total_transferred" INTEGER NOT NULL DEFAULT 0,
    "daily_transferred" INTEGER NOT NULL DEFAULT 0,
    "last_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userbot_sessions_pkey" PRIMARY KEY ("id")
);

-- 添加索引
CREATE INDEX "userbot_sessions_is_active_is_available_idx" ON "userbot_sessions"("is_active", "is_available");
CREATE INDEX "userbot_sessions_flood_wait_until_idx" ON "userbot_sessions"("flood_wait_until");
CREATE INDEX "userbot_sessions_priority_idx" ON "userbot_sessions"("priority");

-- 在 transfer_tasks 表中添加 current_session_id 字段
ALTER TABLE "transfer_tasks" ADD COLUMN "current_session_id" INTEGER;
```

## 验证迁移

运行以下命令验证迁移是否成功：

```bash
npx prisma db pull
npx prisma validate
```

## 回滚（如果需要）

如果需要回滚迁移：

```bash
npx prisma migrate resolve --rolled-back add_session_pool
```

然后手动删除表和字段：

```sql
-- 删除 userbot_sessions 表
DROP TABLE IF EXISTS "userbot_sessions";

-- 删除 transfer_tasks 表中的 current_session_id 字段
ALTER TABLE "transfer_tasks" DROP COLUMN IF EXISTS "current_session_id";
```

## 注意事项

1. **备份数据库**：在执行迁移前，建议先备份数据库
2. **停止应用**：迁移期间建议停止应用，避免数据不一致
3. **测试环境**：建议先在测试环境中验证迁移
4. **权限检查**：确保数据库用户有创建表和修改表的权限

## 迁移后配置

迁移完成后，有两种使用方式：

### 方式 1：继续使用环境变量（单 Session）

保持 `.env` 中的配置不变：

```env
USERBOT_API_ID=xxx
USERBOT_API_HASH=xxx
USERBOT_SESSION=xxx
```

系统会继续使用环境变量中的 session，不会使用数据库中的 session 池。

### 方式 2：使用多 Session 功能

1. 注释掉或删除 `.env` 中的以下配置：

```env
# USERBOT_API_ID=xxx
# USERBOT_API_HASH=xxx
# USERBOT_SESSION=xxx
```

2. 使用 `/session` 命令在 Bot 中添加 session 账号

3. 系统会自动从数据库中选择可用的 session

## 故障排查

### 问题：迁移失败 - 表已存在

**解决方案**：
```bash
# 检查表是否已存在
npx prisma db pull

# 如果表已存在，标记迁移为已应用
npx prisma migrate resolve --applied add_session_pool
```

### 问题：Prisma Client 未更新

**解决方案**：
```bash
# 重新生成 Prisma Client
npx prisma generate

# 清除 node_modules 缓存
rm -rf node_modules/.prisma
npm install
```

### 问题：类型错误

**解决方案**：
```bash
# 重新生成类型
npx prisma generate

# 重启 TypeScript 服务器（VSCode）
# Ctrl+Shift+P -> TypeScript: Restart TS Server
```

## 相关文档

- [MULTI_SESSION_GUIDE.md](./MULTI_SESSION_GUIDE.md) - 多 Session 功能使用指南
- [Prisma Migrate 文档](https://www.prisma.io/docs/concepts/components/prisma-migrate)
