# 多 Session 搬运功能 - 快速开始

## 5 分钟快速上手

### 第一步：运行数据库迁移

```bash
# 确保 .env 中配置了 DATABASE_URL
npx prisma migrate dev --name add_session_pool
npx prisma generate
```

### 第二步：配置环境

**选项 A：使用多 Session（推荐）**

新版本使用数据库管理 session，无需在 `.env` 中配置 USERBOT 相关变量。

如果你的 `.env` 中有旧的配置，可以注释掉：

```env
# 以下配置已迁移到数据库管理，可以注释掉
# USERBOT_API_ID=xxx
# USERBOT_API_HASH=xxx
# USERBOT_SESSION=xxx
```

**选项 B：保持单 Session（向后兼容）**

如果你只有一个账号且已配置在 `.env` 中，保持配置不变：

```env
USERBOT_API_ID=your_api_id
USERBOT_API_HASH=your_api_hash
USERBOT_SESSION=your_session_string
```

系统会优先使用环境变量中的默认 session，同时也支持通过 Bot 添加更多 session。

**详细迁移指南：** 查看 [MULTI_SESSION_MIGRATION.md](./MULTI_SESSION_MIGRATION.md)

### 第三步：启动 Bot

```bash
npm run dev
# 或
npm start
```

### 第四步：添加 Session 账号

在 Telegram 中：

```
1. 发送 /session 命令
2. 点击 [➕ 添加新账号]
3. 按提示输入：
   - 账号名称：主力账号
   - API ID：从 https://my.telegram.org 获取
   - API Hash：从 https://my.telegram.org 获取
   - 优先级：10
   - 手机号：+8613800138000
   - 验证码：收到的验证码
4. 完成！
```

### 第五步：开始搬运

```
1. 发送 /transfer 命令
2. 配置搬运参数
3. 开始搬运
4. 系统会自动使用可用的 session 账号
5. 如果被限流，会自动切换到下一个账号
```

## 核心功能一览

### 1. Session 管理

| 功能 | 命令 | 说明 |
|-----|------|------|
| 管理界面 | `/session` | 进入 Session 管理 |
| 添加账号 | 点击按钮 | 通过 Bot 登录新账号 |
| 查看列表 | 点击按钮 | 查看所有账号状态 |
| 启用/禁用 | 点击按钮 | 临时禁用某个账号 |
| 删除账号 | 点击按钮 | 永久删除账号 |
| 重置限流 | 点击按钮 | 手动重置限流状态 |
| 查看统计 | 点击按钮 | 查看转发统计 |

### 2. 自动切换机制

```
搬运中 → 账号 A 被限流 → 自动切换到账号 B → 继续搬运
                ↓
         标记账号 A 限流
         记录解除时间
                ↓
         时间到后自动恢复
```

### 3. 断点续传

```
任务暂停（限流/批次限制）
    ↓
保存进度（消息 ID、session ID）
    ↓
稍后继续
    ↓
从上次位置继续搬运
```

## 常用操作

### 查看账号状态

```
/session → [📋 查看账号列表]

显示：
- 账号名称和 ID
- 启用状态（✅/❌）
- 可用状态（🟢/🔴）
- 转发统计（总计/今日）
- 限流信息（如果有）
- 优先级
```

### 添加备用账号

```
/session → [➕ 添加新账号]

建议配置：
- 账号名称：备用账号1
- 优先级：5（低于主力账号）
- 其他按提示输入
```

### 处理限流

**自动处理（推荐）：**
- 系统自动切换到其他账号
- 无需人工干预

**手动处理：**
```
/session → [📋 查看账号列表] → [🔄 重置限流]
```

### 调整优先级

目前需要删除后重新添加，未来版本会支持直接修改。

临时方案：
1. 记录账号的 API ID、Hash、Session String
2. 删除账号
3. 重新添加并设置新的优先级

## 推荐配置

### 小规模使用（< 1000 文件/天）

**账号配置：**
```
账号1（主力）：priority=10
账号2（备用）：priority=5
```

**速率配置：**
```typescript
BATCH_SIZE: 500
FORWARD_RATE: 1500
PAUSE_AFTER_FILES: 50
PAUSE_DURATION: 15000
```

### 中规模使用（1000-5000 文件/天）

**账号配置：**
```
账号1（主力1）：priority=10
账号2（主力2）：priority=9
账号3（备用1）：priority=5
账号4（备用2）：priority=3
```

**速率配置：**
```typescript
BATCH_SIZE: 300
FORWARD_RATE: 2000
PAUSE_AFTER_FILES: 30
PAUSE_DURATION: 20000
```

### 大规模使用（> 5000 文件/天）

**账号配置：**
```
账号1-3（主力）：priority=10, 9, 8
账号4-6（备用）：priority=5, 4, 3
账号7-8（应急）：priority=1, 0
```

**速率配置：**
```typescript
BATCH_SIZE: 200
FORWARD_RATE: 2500
PAUSE_AFTER_FILES: 20
PAUSE_DURATION: 30000
LONG_PAUSE_AFTER_FILES: 80
LONG_PAUSE_DURATION: 180000
```

## 故障排查速查表

| 问题 | 可能原因 | 解决方案 |
|-----|---------|---------|
| 无法添加账号 | API 凭证错误 | 检查 API ID/Hash |
| 所有账号限流 | 速率过快 | 降低 FORWARD_RATE |
| 账号频繁限流 | 新账号/异常账号 | 使用真实活跃账号 |
| 切换失败 | 无可用账号 | 添加更多账号 |
| 迁移失败 | 缺少 DATABASE_URL | 配置环境变量 |
| 类型错误 | Prisma Client 未更新 | 运行 prisma generate |

## 监控建议

### 每日检查

```
1. 查看账号状态：/session → [📋 查看账号列表]
2. 检查限流情况
3. 查看转发统计
```

### 每周检查

```
1. 查看总体统计：/session → [📊 账号统计]
2. 评估账号健康度
3. 调整优先级（如需要）
```

### 异常告警

关注日志中的关键信息：

```bash
# 限流告警
grep "FloodWait" logs/app.log

# 切换记录
grep "Switched from session" logs/app.log

# 错误记录
grep "ERROR" logs/app.log
```

## 性能优化提示

### 1. 速率控制

```typescript
// 保守模式（最安全）
FORWARD_RATE: 3000  // 每 3 秒一个文件

// 标准模式（推荐）
FORWARD_RATE: 2000  // 每 2 秒一个文件

// 激进模式（容易限流）
FORWARD_RATE: 1000  // 每秒一个文件
```

### 2. 批次大小

```typescript
// 小批次（频繁保存进度）
BATCH_SIZE: 100

// 中批次（推荐）
BATCH_SIZE: 300

// 大批次（减少中断）
BATCH_SIZE: 500
```

### 3. 暂停策略

```typescript
// 频繁暂停（更安全）
PAUSE_AFTER_FILES: 20
PAUSE_DURATION: 30000

// 标准暂停（推荐）
PAUSE_AFTER_FILES: 50
PAUSE_DURATION: 15000

// 少量暂停（更快但风险高）
PAUSE_AFTER_FILES: 100
PAUSE_DURATION: 10000
```

## 安全提示

⚠️ **重要安全建议：**

1. **保护 Session 数据**
   - Session String 相当于账号密码
   - 定期备份数据库
   - 限制数据库访问权限

2. **账号安全**
   - 启用两步验证
   - 使用真实手机号
   - 避免共享账号

3. **合规使用**
   - 遵守 Telegram ToS
   - 不要用于垃圾信息
   - 尊重频道版权

4. **数据安全**
   - 不要在公共环境运行
   - 使用 HTTPS 连接数据库
   - 定期更新依赖

## 下一步

完成快速开始后，建议阅读：

1. [MULTI_SESSION_GUIDE.md](./MULTI_SESSION_GUIDE.md) - 详细功能说明
2. [MULTI_SESSION_BEST_PRACTICES.md](./MULTI_SESSION_BEST_PRACTICES.md) - 最佳实践
3. [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) - 数据库迁移详情

## 获取帮助

遇到问题？

1. 查看日志：`tail -f logs/app.log`
2. 检查配置：确认 `.env` 和数据库配置
3. 查看文档：阅读上述详细文档
4. 提交 Issue：在 GitHub 上报告问题

## 版本信息

- 功能版本：v1.0.0
- 最低要求：Node.js 16+, PostgreSQL 12+
- 兼容性：向后兼容单 Session 模式

---

**祝使用愉快！** 🚀
