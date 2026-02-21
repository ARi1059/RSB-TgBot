# 多 Session 搬运最佳实践

## 快速开始

### 场景 1：首次使用多 Session 功能

**步骤：**

1. 注释掉 `.env` 中的单 session 配置：
```env
# USERBOT_API_ID=xxx
# USERBOT_API_HASH=xxx
# USERBOT_SESSION=xxx
```

2. 运行数据库迁移：
```bash
npx prisma migrate dev --name add_session_pool
npx prisma generate
```

3. 启动 Bot 并使用 `/session` 命令添加第一个账号

4. 开始搬运任务，系统会自动使用新添加的账号

### 场景 2：已有单 Session，想升级到多 Session

**步骤：**

1. 保持 `.env` 配置不变，先运行迁移：
```bash
npx prisma migrate dev --name add_session_pool
npx prisma generate
```

2. 使用 `/session` 添加额外的备用账号

3. 当主账号（环境变量）被限流时，手动注释掉环境变量配置，重启 Bot

4. 系统会自动使用数据库中的账号池

### 场景 3：大批量搬运（推荐配置）

**账号配置：**
- 3-5 个 session 账号
- 设置不同优先级（10, 8, 5, 3, 0）
- 使用真实、活跃的账号

**速率配置：**
```typescript
// src/constants/index.ts
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 300,           // 降低批次大小
  FORWARD_RATE: 2000,        // 增加间隔到 2 秒
  PAUSE_AFTER_FILES: 30,     // 每 30 个文件暂停
  PAUSE_DURATION: 20000,     // 暂停 20 秒
  LONG_PAUSE_AFTER_FILES: 100,
  LONG_PAUSE_DURATION: 120000, // 长暂停 2 分钟
};
```

## 实际使用示例

### 示例 1：添加 3 个账号

```
管理员: /session

Bot: 🔐 Session 账号管理
     📊 当前状态：
     • 总账号数：0
     • 已启用：0
     • 可用：0
     • 限流中：0

     [➕ 添加新账号] [📋 查看账号列表] [📊 账号统计] [🔙 返回主菜单]

管理员: [点击 ➕ 添加新账号]

Bot: 请输入账号名称（用于识别）：

管理员: 主力账号

Bot: 请输入 API ID：

管理员: 12345678

Bot: 请输入 API Hash：

管理员: abcdef1234567890abcdef1234567890

Bot: 请输入优先级（数字越大优先级越高，默认 0）：

管理员: 10

Bot: 🔐 开始登录流程...
     请输入手机号（国际格式，如 +8613800138000）：

管理员: +8613800138000

Bot: 📱 验证码已发送，请输入验证码：

管理员: 12345

Bot: ✅ 账号 "主力账号" 添加成功！
```

重复以上步骤添加"备用账号1"（优先级 5）和"备用账号2"（优先级 0）。

### 示例 2：搬运任务自动切换

```
管理员: /transfer

Bot: [配置搬运任务...]

管理员: [开始搬运]

Bot: 🚀 搬运中...
     📦 批次：1 (45/300)
     ✅ 已扫描：150 条消息
     🔍 匹配关键字：45 条
     📥 已转发：45 个文件
     ⚡ 速率：30 文件/分钟
     ⏱️ 用时：90秒

[账号被限流...]

Bot: 🔄 已切换账号继续搬运
     📦 批次：1 (45/300)
     ✅ 已扫描：150 条消息
     🔍 匹配关键字：45 条
     📥 已转发：45 个文件
     🔄 Session: 2

[继续搬运...]

Bot: ✅ 转发完成！Bot 正在创建合集...
     📦 批次：1
     ✅ 已扫描：500 条消息
     🔍 匹配关键字：280 条
     📥 已转发：280 个文件
     ⏱️ 用时：15分30秒
```

### 示例 3：查看账号状态

```
管理员: /session → [📋 查看账号列表]

Bot: 📋 Session 账号列表

     ✅ 🔴 #1 主力账号
       📊 总转发：1250 | 今日：280
       🎯 优先级：10
       ⏳ 限流至：2024-01-15 15:30:00

     ✅ 🟢 #2 备用账号1
       📊 总转发：850 | 今日：150
       🎯 优先级：5

     ✅ 🟢 #3 备用账号2
       📊 总转发：420 | 今日：80
       🎯 优先级：0

     [#1 主力账号] [🔴 禁用]
     [🔄 重置限流]
     [🗑️ 删除]

     [#2 备用账号1] [🔴 禁用]
     [🗑️ 删除]

     [#3 备用账号2] [🔴 禁用]
     [🗑️ 删除]

     [🔙 返回]
```

## 常见问题与解决方案

### Q1: 如何判断需要多少个账号？

**A:** 根据每日搬运量估算：

| 每日搬运量 | 推荐账号数 | 说明 |
|-----------|-----------|------|
| < 500 文件 | 1-2 个 | 单账号足够，1 个备用 |
| 500-2000 文件 | 2-3 个 | 2 个主力 + 1 个备用 |
| 2000-5000 文件 | 3-5 个 | 3 个主力 + 2 个备用 |
| > 5000 文件 | 5+ 个 | 多个主力轮换使用 |

### Q2: 账号被限流后多久可以恢复？

**A:** Telegram 限流时间不固定：
- 轻度限流：几分钟到 1 小时
- 中度限流：1-6 小时
- 重度限流：12-24 小时
- 严重限流：可能长达数天

系统会自动记录限流解除时间，到期后自动恢复使用。

### Q3: 如何避免频繁被限流？

**A:** 最佳实践：

1. **降低速率**：
   - `FORWARD_RATE` 设置为 2000-3000ms
   - 增加 `PAUSE_DURATION` 到 20-30 秒

2. **使用真实账号**：
   - 避免使用新注册账号（< 1 个月）
   - 使用有正常聊天记录的账号
   - 避免使用虚拟号码注册的账号

3. **分散时间**：
   - 避免在同一时间段大量搬运
   - 使用批次功能，分多次完成

4. **轮换使用**：
   - 设置多个账号，让系统自动轮换
   - 不要让单个账号持续高强度工作

### Q4: 所有账号都被限流了怎么办？

**A:** 三种解决方案：

1. **等待恢复**：
   - 查看限流时间，等待最短的那个恢复
   - 使用 `/session` 查看各账号的限流解除时间

2. **添加新账号**：
   - 使用 `/session` 添加新的备用账号
   - 任务会自动使用新账号继续

3. **调整策略**：
   - 降低搬运速率
   - 减小批次大小
   - 增加暂停时间

### Q5: 如何设置账号优先级？

**A:** 优先级策略：

```
高优先级 (10-15)：
- 最稳定的主力账号
- 很少被限流的账号
- 用于重要任务

中优先级 (5-9)：
- 备用主力账号
- 偶尔被限流的账号
- 用于常规任务

低优先级 (0-4)：
- 测试账号
- 新账号
- 临时账号
```

系统会优先使用高优先级账号，只有在高优先级账号不可用时才使用低优先级账号。

### Q6: 如何监控账号使用情况？

**A:** 使用 `/session` 命令：

1. **查看账号列表**：
   - 实时状态（可用/限流）
   - 转发统计（总计/今日）
   - 限流解除时间

2. **查看统计**：
   - 总账号数、可用数、限流数
   - 总转发数、今日转发数
   - 平均每账号转发数

3. **日志监控**：
   - 查看应用日志中的 session 切换记录
   - 关注 `Session X hit FloodWait` 日志
   - 关注 `Switched from session X to session Y` 日志

## 高级技巧

### 技巧 1：按时间段使用不同账号

手动调整优先级，在不同时间段使用不同账号：

```bash
# 白天使用账号 1 和 2
账号1: priority=10
账号2: priority=8
账号3: priority=0 (禁用或低优先级)

# 晚上使用账号 3
账号1: priority=0 (禁用或低优先级)
账号2: priority=0 (禁用或低优先级)
账号3: priority=10
```

### 技巧 2：为不同任务使用不同账号

通过优先级和启用/禁用功能：

```bash
# 大批量搬运任务
启用账号 1, 2, 3 (高优先级)
禁用账号 4, 5

# 小批量测试任务
禁用账号 1, 2, 3
启用账号 4, 5 (测试账号)
```

### 技巧 3：预防性暂停

在账号即将达到限流阈值前主动暂停：

```typescript
// 可以在代码中添加每日限制
export const TRANSFER_CONFIG = {
  MAX_DAILY_TRANSFER: 2000, // 每个账号每日最大转发数
  // ...
};
```

### 技巧 4：账号健康度评估

定期检查账号统计，评估账号健康度：

```
健康账号：
- 总转发数 > 1000
- 很少被限流（< 5%）
- 限流时间短（< 1 小时）

风险账号：
- 频繁被限流（> 20%）
- 限流时间长（> 6 小时）
- 新账号（< 100 转发）

建议：
- 降低风险账号的优先级
- 增加健康账号的优先级
- 淘汰长期被限流的账号
```

## 性能优化建议

### 1. 数据库优化

```sql
-- 定期清理旧的限流记录
UPDATE userbot_sessions
SET is_available = true, flood_wait_until = NULL
WHERE flood_wait_until < NOW();

-- 重置每日计数（可以设置定时任务）
UPDATE userbot_sessions
SET daily_transferred = 0, last_reset_date = NOW()
WHERE DATE(last_reset_date) < CURRENT_DATE;
```

### 2. 连接池管理

系统会自动管理客户端连接池，但可以手动优化：

```typescript
// 在 src/userbot/client.ts 中
// 定期清理不活跃的连接
setInterval(async () => {
  for (const [sessionId, client] of clientPool.entries()) {
    const session = await sessionPool.getSession(sessionId);
    if (session && !session.isActive) {
      await disconnectSession(sessionId);
    }
  }
}, 3600000); // 每小时检查一次
```

### 3. 监控告警

可以添加监控脚本：

```bash
#!/bin/bash
# scripts/monitor-sessions.sh

# 检查可用账号数
AVAILABLE=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM userbot_sessions WHERE is_active = true AND is_available = true;")

if [ "$AVAILABLE" -lt 2 ]; then
  echo "⚠️ 警告：可用账号不足 2 个！"
  # 发送通知（Telegram、邮件等）
fi
```

## 安全建议

1. **保护 Session 数据**：
   - 定期备份数据库
   - 加密存储 session_string
   - 限制数据库访问权限

2. **账号安全**：
   - 启用两步验证
   - 使用强密码
   - 定期检查账号活动

3. **API 凭证安全**：
   - 不要在代码中硬编码 API ID/Hash
   - 使用环境变量或密钥管理服务
   - 定期轮换凭证

4. **日志安全**：
   - 不要在日志中记录完整的 session_string
   - 脱敏处理敏感信息
   - 定期清理旧日志

## 故障恢复

### 场景 1：数据库损坏

```bash
# 1. 停止应用
pm2 stop bot

# 2. 恢复数据库备份
pg_restore -d dbname backup.dump

# 3. 验证数据
npx prisma db pull
npx prisma validate

# 4. 重启应用
pm2 start bot
```

### 场景 2：所有账号失效

```bash
# 1. 清空 session 表
psql $DATABASE_URL -c "TRUNCATE userbot_sessions;"

# 2. 使用环境变量临时恢复
# 在 .env 中配置单个可用的 session

# 3. 重新添加账号
# 使用 /session 命令添加新账号
```

### 场景 3：迁移到新服务器

```bash
# 1. 导出数据
pg_dump -t userbot_sessions $DATABASE_URL > sessions.sql

# 2. 在新服务器导入
psql $NEW_DATABASE_URL < sessions.sql

# 3. 更新配置
# 修改 .env 中的 DATABASE_URL

# 4. 验证连接
npx prisma db pull
```

## 总结

多 Session 功能的核心优势：

✅ **高可用性**：一个账号限流不影响整体任务
✅ **高效率**：多账号轮换，提高搬运速度
✅ **易管理**：Bot 内直接管理，无需手动配置
✅ **可扩展**：随时添加新账号，无需重启
✅ **智能调度**：自动选择最佳账号，自动切换

建议从 2-3 个账号开始，根据实际使用情况逐步调整。
