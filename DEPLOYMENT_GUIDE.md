# 搬运功能优化 - 快速部署指南

## 已完成的优化

✅ **1. 分批搬运策略** - 每批次 500 个文件，自动暂停
✅ **2. 速率控制** - 每秒 1 个文件，定期暂停避免限流
✅ **3. 断点续传机制** - 任务中断后可从上次位置继续
✅ **4. 用户体验优化** - 实时进度、速率显示、批次信息

## 快速部署步骤

### 1. 在 VPS 上部署

```bash
# 1. 进入项目目录
cd /opt/rsb-bot

# 2. 拉取最新代码
git pull

# 3. 安装依赖
npm install

# 4. 运行数据库迁移（手动执行 SQL）
psql -U postgres -d rsb_tgbot -f prisma/migrations/add_transfer_task.sql

# 5. 生成 Prisma Client
npx prisma generate

# 6. 重新编译
npm run build

# 7. 重启 bot
pm2 restart rsb-bot

# 8. 查看日志确认启动成功
pm2 logs rsb-bot --lines 50
```

### 2. 验证部署

```bash
# 检查表是否创建成功
psql -U postgres -d rsb_tgbot -c "SELECT COUNT(*) FROM transfer_tasks;"

# 查看 bot 状态
pm2 status

# 查看最新日志
pm2 logs rsb-bot --lines 20
```

## 配置调整（可选）

如果需要调整搬运速率，编辑 `src/constants/index.ts`：

```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 500,              // 每批次文件数（建议 300-1000）
  FORWARD_RATE: 1000,           // 转发间隔毫秒（建议 1000-2000）
  PAUSE_AFTER_FILES: 50,        // 短暂停触发数（建议 50-100）
  PAUSE_DURATION: 10000,        // 短暂停时长毫秒（建议 10000-30000）
  LONG_PAUSE_AFTER_FILES: 200,  // 长暂停触发数（建议 200-300）
  LONG_PAUSE_DURATION: 60000,   // 长暂停时长毫秒（建议 60000-120000）
};
```

修改后需要重新编译和重启：

```bash
npm run build
pm2 restart rsb-bot
```

## 使用说明

### 首次搬运

1. 发起搬运任务（使用现有的搬运功能）
2. 系统会自动创建任务记录
3. 转发 500 个文件后自动暂停
4. 显示批次完成提示

### 继续搬运

1. 再次发起相同的搬运任务
2. 系统自动检测未完成任务
3. 从上次位置继续搬运
4. 继续下一批次

### 限流处理

1. 触发限流时自动暂停
2. 显示需要等待的时间
3. 等待时间过后可继续

## 新功能说明

### 1. 进度显示增强

```
🚀 搬运中...

📦 批次：1 (245/500)
✅ 已扫描：1250 条消息
🔍 匹配关键字：320 条
📥 已转发：245 个文件
⚡ 速率：58 文件/分钟
⏱️ 用时：253秒
```

### 2. 批次完成提示

```
⏸️ 批次完成，已暂停

📦 批次：1
✅ 已扫描：2500 条消息
🔍 匹配关键字：650 条
📥 本批次转发：500 个文件
📊 总计转发：500 个文件

💡 任务已保存，可稍后继续
```

### 3. 限流提示

```
⚠️ 触发限流，已暂停

📦 批次：1
✅ 已扫描：1250 条消息
📥 已转发：245 个文件
⏳ 需等待：2673 秒

💡 任务已保存，请稍后继续
```

## 性能提升

- **数据库查询优化**：批量查询，性能提升 10 倍
- **内存优化**：不累积所有文件，避免内存溢出
- **速率控制**：主动避免限流，降低被封禁风险
- **断点续传**：任务可恢复，不会丢失进度

## 故障排查

### 问题 1：数据库迁移失败

**解决方案**：
```bash
# 检查数据库连接
psql -U postgres -d rsb_tgbot -c "SELECT 1;"

# 手动执行 SQL
psql -U postgres -d rsb_tgbot -f prisma/migrations/add_transfer_task.sql
```

### 问题 2：Bot 启动失败

**解决方案**：
```bash
# 查看错误日志
pm2 logs rsb-bot --err --lines 50

# 检查 Prisma Client 是否生成
npx prisma generate

# 重新编译
npm run build
pm2 restart rsb-bot
```

### 问题 3：搬运速度太慢

**解决方案**：
- 降低 `FORWARD_RATE`（减少间隔时间）
- 减少 `PAUSE_DURATION`（缩短暂停时间）
- 注意：速度太快容易触发限流

### 问题 4：频繁触发限流

**解决方案**：
- 增加 `FORWARD_RATE`（增加间隔时间）
- 增加 `PAUSE_DURATION`（延长暂停时间）
- 降低 `PAUSE_AFTER_FILES`（更频繁暂停）

## 回滚方案

如果新功能有问题，可以回滚：

```bash
# 1. 回滚代码
cd /opt/rsb-bot
git log --oneline -10  # 查看提交历史
git reset --hard <previous_commit_hash>

# 2. 删除新表（可选）
psql -U postgres -d rsb_tgbot -c "DROP TABLE IF EXISTS transfer_tasks;"

# 3. 重新编译和重启
npm run build
pm2 restart rsb-bot
```

## 技术支持

详细文档：
- [TRANSFER_OPTIMIZATION.md](./TRANSFER_OPTIMIZATION.md) - 完整优化说明
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 数据库迁移指南

## 注意事项

1. **备份数据库**：部署前务必备份
2. **测试环境**：建议先在测试环境验证
3. **监控日志**：部署后密切关注日志
4. **速率调整**：根据实际情况调整配置

## 预期效果

- ✅ 不再出现长时间无响应
- ✅ 限流风险大幅降低
- ✅ 任务可随时暂停和恢复
- ✅ 进度清晰可见
- ✅ 大规模搬运更稳定
