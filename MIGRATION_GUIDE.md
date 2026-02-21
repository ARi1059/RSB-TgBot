# 搬运功能优化 - 数据库迁移指南

## 迁移步骤

### 1. 生成迁移文件

在项目根目录运行：

```bash
npx prisma migrate dev --name add_transfer_task
```

这将：
- 创建新的迁移文件
- 在数据库中创建 `transfer_tasks` 表
- 更新 Prisma Client

### 2. 生成 Prisma Client

```bash
npx prisma generate
```

### 3. 验证迁移

```bash
# 查看数据库表
npx prisma studio
```

## 生产环境部署

### 1. 在 VPS 上执行

```bash
# 进入项目目录
cd /opt/rsb-bot

# 拉取最新代码
git pull

# 安装依赖
npm install

# 运行数据库迁移
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate

# 重新编译
npm run build

# 重启 bot
pm2 restart rsb-bot

# 查看日志
pm2 logs rsb-bot --lines 50
```

### 2. 回滚迁移（如果需要）

```bash
# 查看迁移历史
npx prisma migrate status

# 回滚到上一个版本（谨慎使用）
# 注意：这会删除 transfer_tasks 表
npx prisma migrate resolve --rolled-back <migration_name>
```

## 注意事项

1. **备份数据库**：迁移前务必备份数据库
2. **测试环境**：先在测试环境验证迁移
3. **停机时间**：迁移过程中 bot 可能需要短暂停机
4. **权限检查**：确保数据库用户有创建表的权限

## 迁移后验证

```bash
# 检查表是否创建成功
psql -U postgres -d rsb_tgbot -c "\dt"

# 查看表结构
psql -U postgres -d rsb_tgbot -c "\d transfer_tasks"
```

## 常见问题

### Q: 迁移失败怎么办？

A: 检查错误信息，常见原因：
- 数据库连接失败
- 权限不足
- 表名冲突

### Q: 如何手动创建表？

A: 如果自动迁移失败，可以手动执行 SQL：

```sql
CREATE TABLE transfer_tasks (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  source_channel VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  total_scanned INTEGER DEFAULT 0,
  total_matched INTEGER DEFAULT 0,
  total_transferred INTEGER DEFAULT 0,
  last_message_id INTEGER,
  batch_number INTEGER DEFAULT 0,
  config TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfer_tasks_user_id ON transfer_tasks(user_id);
CREATE INDEX idx_transfer_tasks_status ON transfer_tasks(status);
CREATE INDEX idx_transfer_tasks_created_at ON transfer_tasks(created_at);
```

### Q: 旧任务数据会丢失吗？

A: 不会。这是新增表，不影响现有数据。
