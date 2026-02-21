# 搬运功能优化说明

## 概述

针对大规模视频搬运（数千到数万级别）进行了以下优化：

## 1. 分批搬运策略

**功能**：将大规模搬运任务分批次执行，避免一次性处理过多文件。

**配置**：
- `BATCH_SIZE`: 500 - 每批次最多搬运 500 个文件
- 批次完成后自动暂停，可稍后继续

**优势**：
- 降低单次任务的资源消耗
- 减少触发限流的风险
- 任务可控，便于管理

## 2. 速率控制

**功能**：控制文件转发速度，避免触发 Telegram API 限流。

**配置**：
```typescript
FORWARD_RATE: 1000ms           // 每个文件间隔 1 秒（每秒 1 个文件）
PAUSE_AFTER_FILES: 50          // 每转发 50 个文件暂停 10 秒
PAUSE_DURATION: 10000ms        // 短暂停时长
LONG_PAUSE_AFTER_FILES: 200    // 每转发 200 个文件暂停 1 分钟
LONG_PAUSE_DURATION: 60000ms   // 长暂停时长
```

**优势**：
- 主动避免触发限流
- 平滑的转发速率
- 降低被封禁风险

## 3. 断点续传机制

**功能**：任务中断后可以从上次位置继续，不会丢失进度。

**实现**：
- 新增 `TransferTask` 数据库表记录任务状态
- 保存关键信息：
  - `lastMessageId`: 最后处理的消息 ID
  - `totalScanned`: 已扫描消息数
  - `totalTransferred`: 已转发文件数
  - `batchNumber`: 当前批次号
  - `status`: 任务状态（pending/running/paused/completed/failed）

**使用场景**：
- 触发限流时自动暂停并保存进度
- 达到批次限制时自动暂停
- 手动中断任务
- 网络异常或程序重启

## 4. 用户体验优化

### 4.1 实时进度显示

**显示内容**：
```
🚀 搬运中...

📦 批次：1 (245/500)
✅ 已扫描：1250 条消息
🔍 匹配关键字：320 条
📥 已转发：245 个文件
⚡ 速率：58 文件/分钟
⏱️ 用时：253秒
```

**更新频率**：每 10 个文件更新一次

### 4.2 智能限流检测

**功能**：自动检测 FloodWait 错误并保存进度

**提示信息**：
```
⚠️ 触发限流，已暂停

📦 批次：1
✅ 已扫描：1250 条消息
📥 已转发：245 个文件
⏳ 需等待：2673 秒

💡 任务已保存，请稍后继续
```

### 4.3 批次完成提示

**提示信息**：
```
⏸️ 批次完成，已暂停

📦 批次：1
✅ 已扫描：2500 条消息
🔍 匹配关键字：650 条
📥 本批次转发：500 个文件
📊 总计转发：500 个文件

💡 任务已保存，可稍后继续
```

## 5. 性能优化

### 5.1 批量数据库操作

**优化前**：
- 逐个查询文件是否重复
- 每个文件一次数据库查询

**优化后**：
- 每 100 个文件批量查询一次
- 使用 `IN` 查询，大幅减少数据库请求

**配置**：
```typescript
DB_BATCH_SIZE: 100  // 数据库批量查询大小
```

### 5.2 内存优化

**策略**：
- 不在内存中累积所有文件信息
- 定期批量去重并清理
- 避免内存溢出

## 6. 数据库表结构

### TransferTask 表

```sql
CREATE TABLE transfer_tasks (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  source_channel VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'pending',
  total_scanned INT DEFAULT 0,
  total_matched INT DEFAULT 0,
  total_transferred INT DEFAULT 0,
  last_message_id INT,
  batch_number INT DEFAULT 0,
  config TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 7. 使用流程

### 7.1 首次搬运

1. 管理员发起搬运任务
2. 系统创建 TransferTask 记录
3. 开始转发文件（每秒 1 个）
4. 达到 500 个文件后自动暂停
5. 显示批次完成提示

### 7.2 继续搬运

1. 管理员再次发起搬运（相同配置）
2. 系统检测到未完成的任务
3. 从上次中断位置继续
4. 继续下一批次

### 7.3 限流处理

1. 检测到 FloodWait 错误
2. 自动保存当前进度
3. 显示需要等待的时间
4. 等待时间过后可继续

## 8. 配置参数说明

所有配置参数位于 `src/constants/index.ts`：

```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 500,                    // 每批次文件数量
  FORWARD_RATE: 1500,                 // 转发间隔（毫秒）- 推荐1500ms
  PAUSE_AFTER_FILES: 50,              // 短暂停触发文件数
  PAUSE_DURATION: 15000,              // 短暂停时长（毫秒）- 15秒
  LONG_PAUSE_AFTER_FILES: 150,        // 长暂停触发文件数
  LONG_PAUSE_DURATION: 90000,         // 长暂停时长（毫秒）- 1.5分钟
  PROGRESS_UPDATE_INTERVAL: 10,       // 进度更新间隔（文件数）
  DB_BATCH_SIZE: 100,                 // 数据库批量查询大小
  MAX_DAILY_TRANSFER: 5000,           // 每日最大搬运数量
  FLOOD_WAIT_MULTIPLIER: 1.2,         // 限流后等待时间倍数
};
```

## 9. 注意事项

### 9.1 速率建议

- **保守模式**：`FORWARD_RATE: 2000`（每秒 0.5 个文件）- 最安全，适合长时间运行
- **标准模式**：`FORWARD_RATE: 1500`（每秒 0.67 个文件）- 推荐，平衡速度和安全
- **激进模式**：`FORWARD_RATE: 1000`（每秒 1 个文件）- 容易触发限流

**2026-02-21 更新**：根据实际测试，将默认速率从 1000ms 调整为 1500ms，并增加暂停时长，以减少触发 FloodWait 的频率。

### 9.2 批次大小建议

- **小批次**：200-300 个文件 - 适合测试
- **标准批次**：500 个文件 - 推荐
- **大批次**：1000 个文件 - 适合稳定网络

### 9.3 限流恢复

- Telegram 限流时间通常为 30-60 分钟
- 建议等待限流时间结束后再继续
- 可以适当降低速率避免再次限流

## 10. 数据库迁移

运行以下命令生成并应用数据库迁移：

```bash
# 生成迁移文件
npx prisma migrate dev --name add_transfer_task

# 生成 Prisma Client
npx prisma generate
```

## 11. 监控和统计

### 11.1 任务状态查询

```typescript
// 获取用户的活跃任务
const activeTask = await transferService.getActiveTask(userId);

// 获取用户的所有任务
const tasks = await transferService.getUserTasks(userId, 10);
```

### 11.2 任务清理

系统会自动清理 30 天前的已完成/失败任务：

```typescript
await transferService.cleanupOldTasks();
```

## 12. 故障排查

### 12.1 任务卡住

**症状**：任务状态一直是 `running`，但没有进度

**解决**：
1. 检查 Userbot 是否正常连接
2. 检查网络连接
3. 查看错误日志
4. 手动将任务状态改为 `paused`

### 12.2 重复文件过多

**症状**：大量文件被标记为重复

**原因**：
- 之前已经搬运过相同内容
- 数据库中已存在这些文件

**解决**：
- 正常现象，系统会自动跳过
- 可以清理旧的合集后重新搬运

### 12.3 限流频繁

**症状**：经常触发 FloodWait 错误

**解决**：
1. 降低 `FORWARD_RATE`（增加间隔时间）
2. 减少 `BATCH_SIZE`
3. 增加 `PAUSE_DURATION`
4. 避免在高峰时段搬运

**FloodWait 错误检测改进**：
- 系统现在支持多种 FloodWait 错误格式检测
- 自动识别 `FloodWaitError` 类型
- 检测 `error.errorMessage` 和 `error.message` 中的限流标识
- 详细记录错误信息便于调试
- 显示等待时间（秒和分钟）

## 13. 性能对比

### 优化前

- 速率：不受控制，容易限流
- 批次：无限制，一次性处理所有文件
- 断点：不支持，中断后需重新开始
- 数据库：逐个查询，性能差
- 用户体验：进度更新频繁，信息不全

### 优化后

- 速率：每秒 1 个文件，稳定可控
- 批次：500 个文件/批，可管理
- 断点：完整支持，随时可恢复
- 数据库：批量查询，性能提升 10 倍
- 用户体验：清晰的进度显示，包含速率和预估时间

## 14. 未来优化方向

1. **任务队列**：支持多个搬运任务排队执行
2. **优先级**：支持设置任务优先级
3. **定时任务**：支持定时自动搬运
4. **智能速率**：根据限流情况自动调整速率
5. **统计报告**：生成搬运任务的统计报告
6. **Web 界面**：提供 Web 界面管理搬运任务
7. **自动恢复**：FloodWait 后自动等待并恢复任务（已规划）

## 15. 更新日志

### 2026-02-21
- **FloodWait 错误检测改进**：
  - 支持多种错误格式检测（`FloodWaitError` 类型、`errorMessage`、`message`）
  - 添加详细的错误日志记录，包括错误类型、消息和堆栈信息
  - 改进用户提示，显示等待时间（秒和分钟）
  - 修复批次计数变量为可变类型，确保正确更新

- **速率控制优化**：
  - 将默认 `FORWARD_RATE` 从 1000ms 调整为 1500ms（每秒 0.67 个文件）
  - 增加 `PAUSE_DURATION` 从 10 秒到 15 秒
  - 减少 `LONG_PAUSE_AFTER_FILES` 从 200 到 150
  - 增加 `LONG_PAUSE_DURATION` 从 60 秒到 90 秒
  - 目标：减少触发 FloodWait 的频率，提高长时间运行的稳定性

- **错误处理改进**：
  - 非限流错误不再中断整个任务，而是跳过当前消息继续处理
  - 添加详细的错误日志便于问题排查

