# 多 Session 账号管理功能说明

## 功能概述

本系统支持使用多个 Telegram UserBot Session 账号来完成大批量搬运工作，具备以下特性：

1. **Session 账号池管理**：支持添加、删除、启用/禁用多个 session 账号
2. **自动切换机制**：当某个账号被限流时，自动切换到下一个可用账号继续搬运
3. **断点续传**：从限流处继续搬运，不会丢失进度
4. **Bot 内管理**：可以在 bot 上直接登录、管理 session 账号

## 数据库变更

### 新增表：UserBotSession

存储 session 账号池信息：

- `id`: 账号 ID
- `name`: 账号名称（用于识别）
- `apiId` / `apiHash`: Telegram API 凭证
- `sessionString`: Session 字符串
- `isActive`: 是否启用
- `isAvailable`: 是否可用（未被限流）
- `floodWaitUntil`: 限流解除时间
- `lastUsedAt`: 最后使用时间
- `totalTransferred`: 总转发数
- `dailyTransferred`: 今日转发数
- `priority`: 优先级（数字越大优先级越高）

### TransferTask 表新增字段

- `currentSessionId`: 当前使用的 session ID（用于断点续传）

## 使用方法

### 1. 添加 Session 账号

使用管理员命令：

```
/session
```

进入 Session 管理界面，选择"➕ 添加新账号"，按照提示输入：

1. 账号名称（用于识别，如 "账号1"）
2. API ID（从 https://my.telegram.org 获取）
3. API Hash
4. 优先级（可选，默认 0，数字越大优先级越高）
5. 手机号（国际格式，如 +8613800138000）
6. 验证码
7. 两步验证密码（如果有）

添加成功后，该账号会自动加入账号池。

### 2. 管理 Session 账号

在 `/session` 管理界面可以：

- **查看账号列表**：显示所有账号的状态、转发统计、限流状态
- **启用/禁用账号**：临时禁用某个账号
- **删除账号**：永久删除账号
- **重置限流状态**：手动重置被限流的账号（如果确认限流已解除）
- **查看统计**：查看所有账号的总体统计信息

### 3. 搬运任务自动切换

当执行搬运任务时：

1. 系统会自动选择一个可用的 session 账号（按优先级和最后使用时间）
2. 如果该账号被限流，系统会：
   - 标记该账号为"限流中"
   - 自动切换到下一个可用账号
   - 从中断处继续搬运
3. 如果所有账号都被限流，任务会暂停并提示添加新账号

### 4. 断点续传

任务暂停后（无论是批次限制还是限流），可以：

1. 等待限流解除后继续
2. 添加新的 session 账号后继续
3. 系统会自动从上次中断的位置继续搬运

## 工作原理

### Session 选择策略

系统按以下顺序选择 session：

1. 只选择 `isActive=true` 且 `isAvailable=true` 的账号
2. 自动重置已过期的限流状态
3. 按优先级降序排序
4. 相同优先级按最后使用时间升序排序（轮流使用）

### 限流处理流程

```
搬运中 → 触发限流 → 标记当前 session 为限流
         ↓
    尝试获取新 session
         ↓
    ┌────┴────┐
    ↓         ↓
  成功      失败
    ↓         ↓
切换账号   暂停任务
继续搬运   等待/添加账号
```

### 数据统计

每个 session 会记录：

- **总转发数**：累计转发的文件数
- **今日转发数**：每天 0 点自动重置
- **最后使用时间**：用于轮流使用策略

## 配置建议

### 优先级设置

- **高优先级账号**（priority=10）：稳定的主力账号
- **中优先级账号**（priority=5）：备用账号
- **低优先级账号**（priority=0）：测试账号或临时账号

### 账号数量

建议配置：

- **小规模搬运**（<1000 文件/天）：1-2 个账号
- **中规模搬运**（1000-5000 文件/天）：3-5 个账号
- **大规模搬运**（>5000 文件/天）：5+ 个账号

### 速率控制

在 `src/constants/index.ts` 中的 `TRANSFER_CONFIG` 可以调整：

```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 500,           // 每批次文件数
  FORWARD_RATE: 1500,        // 转发间隔（毫秒）
  PAUSE_AFTER_FILES: 50,     // 每 N 个文件暂停
  PAUSE_DURATION: 15000,     // 暂停时长
  LONG_PAUSE_AFTER_FILES: 150,
  LONG_PAUSE_DURATION: 90000,
};
```

## 向后兼容

系统保持向后兼容，如果环境变量中配置了：

```
USERBOT_API_ID=xxx
USERBOT_API_HASH=xxx
USERBOT_SESSION=xxx
```

系统会优先使用环境变量中的默认 session，不会从数据库中选择。

如果要使用多 session 功能，请移除或注释掉这些环境变量。

## 数据库迁移

运行以下命令应用数据库变更：

```bash
npx prisma migrate dev --name add_session_pool
npx prisma generate
```

## 注意事项

1. **API 凭证安全**：Session 字符串包含敏感信息，请妥善保管数据库
2. **限流风险**：即使使用多账号，也要注意合理控制速率
3. **账号质量**：建议使用真实、活跃的账号，避免使用新注册或异常账号
4. **监控统计**：定期查看账号统计，及时发现异常
5. **备份 Session**：建议定期备份数据库中的 session 数据

## 故障排查

### 问题：所有账号都被限流

**解决方案**：
1. 检查 `TRANSFER_CONFIG` 中的速率设置是否过于激进
2. 添加更多 session 账号
3. 等待限流解除（通常几小时到一天）

### 问题：账号无法登录

**解决方案**：
1. 检查 API ID 和 API Hash 是否正确
2. 检查网络连接和代理设置
3. 确认手机号格式正确（国际格式）
4. 检查验证码是否正确

### 问题：切换账号失败

**解决方案**：
1. 检查数据库中是否有可用的 session
2. 查看日志确认错误原因
3. 尝试手动重置限流状态

## 命令参考

- `/session` - 进入 Session 管理界面（管理员）
- `/transfer` - 开始搬运任务（会自动使用可用 session）

## 技术架构

### 核心文件

- `prisma/schema.prisma` - 数据库模型定义
- `src/services/sessionPool.ts` - Session 池管理服务
- `src/userbot/client.ts` - 客户端连接管理
- `src/userbot/transfer.ts` - 搬运逻辑（含自动切换）
- `src/bot/conversations/sessionManageFlow.ts` - Session 管理界面

### 关键函数

- `getAvailableSession()` - 获取可用 session
- `markSessionFloodWait()` - 标记 session 限流
- `getAvailableSessionClient()` - 获取可用客户端
- `incrementSessionTransfer()` - 更新转发统计
