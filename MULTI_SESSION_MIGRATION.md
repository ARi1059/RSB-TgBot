# 多 Session 配置迁移指南

## 概述

新版本支持多 Session 架构，可以配置多个 Telegram 账号用于搬运任务，当一个账号被限流时自动切换到其他可用账号。

## 架构变化

### 旧版本（单 Session）
- 通过环境变量配置单个 userbot session
- 遇到限流必须等待
- 配置方式：`.env` 文件

### 新版本（多 Session）
- 通过数据库管理多个 session
- 自动检测限流并切换账号
- 配置方式：Bot 管理界面
- **向后兼容**：仍支持环境变量配置的默认 session

## 迁移步骤

### 方案 1：保持现有配置（推荐新手）

如果你只有一个 Telegram 账号，可以继续使用现有的环境变量配置：

```env
# .env 文件
USERBOT_API_ID=your_api_id
USERBOT_API_HASH=your_api_hash
USERBOT_SESSION=your_session_string
```

系统会自动将这个配置作为默认 session 使用。

### 方案 2：迁移到数据库管理（推荐）

#### 步骤 1：通过 Bot 添加现有账号

1. 启动 Bot，进入管理员菜单
2. 选择 "🔐 Session 管理"
3. 点击 "➕ 添加新账号"
4. 按提示输入：
   - 账号名称：如 "主账号"
   - API ID：你的 `USERBOT_API_ID`
   - API Hash：你的 `USERBOT_API_HASH`
   - 优先级：10（数字越大优先级越高）
   - 手机号：用于登录的手机号
   - 验证码：收到的验证码
   - 两步验证密码（如果有）

#### 步骤 2：验证账号已添加

1. 在 "Session 管理" 中选择 "📋 查看账号列表"
2. 确认账号状态为 ✅ 🟢（已启用且可用）

#### 步骤 3：移除环境变量（可选）

添加成功后，可以注释掉 `.env` 中的配置：

```env
# 已迁移到数据库管理，以下配置可以注释
# USERBOT_API_ID=your_api_id
# USERBOT_API_HASH=your_api_hash
# USERBOT_SESSION=your_session_string
```

## 添加更多 Session

### 为什么需要多个 Session？

- **限流规避**：每个 API ID 有独立的限流配额
- **提高效率**：一个账号限流时自动切换到其他账号
- **负载均衡**：多个账号分担搬运任务

### 如何获取多个 API ID？

每个 API ID 需要一个独立的 Telegram 账号：

1. **准备手机号**
   - 可以使用虚拟号码服务（如接码平台）
   - 或使用家人朋友的手机号

2. **注册 Telegram 账号**
   - 使用手机号注册新的 Telegram 账号
   - 完成验证

3. **申请 API ID**
   - 访问 https://my.telegram.org/apps
   - 使用新账号登录
   - 点击 "API development tools"
   - 填写应用信息：
     - App title: 任意名称（如 "My Bot"）
     - Short name: 任意短名称（如 "mybot"）
     - Platform: 选择 "Other"
   - 提交后获得 `api_id` 和 `api_hash`

4. **通过 Bot 添加**
   - 在 Bot 的 "Session 管理" 中添加新账号
   - 输入新的 API ID 和 API Hash
   - 完成登录验证

### 建议配置

| 使用场景 | Session 数量 | 说明 |
|---------|-------------|------|
| 轻度使用 | 1-2 个 | 偶尔搬运，单个 session 够用 |
| 中度使用 | 3-5 个 | 频繁搬运，可以轮换使用 |
| 重度使用 | 5-10 个 | 大量搬运，确保始终有可用 session |

## Session 管理功能

### 查看账号列表

显示所有已添加的 session，包括：
- 账号状态（启用/禁用）
- 可用状态（可用/限流中）
- 转发统计（总计/今日）
- 优先级
- 限流解除时间

### 启用/禁用账号

- 禁用的账号不会被自动选择使用
- 可以临时禁用某些账号进行维护

### 删除账号

- 永久删除 session 记录
- 操作不可恢复，请谨慎操作

### 重置限流状态

- 手动重置限流状态
- 适用于限流时间已过但系统未自动更新的情况

### 账号统计

查看所有账号的统计信息：
- 总账号数
- 已启用账号数
- 可用账号数
- 限流中账号数
- 总转发数
- 今日转发数

## 自动切换机制

系统会在以下情况自动切换 session：

1. **检测到限流**
   - 捕获 `FLOOD_WAIT` 错误
   - 标记当前 session 为限流状态
   - 记录限流解除时间
   - 自动切换到其他可用 session

2. **选择策略**
   - 优先选择优先级高的 session
   - 排除已限流的 session
   - 排除已禁用的 session
   - 优先选择今日转发数较少的 session

3. **断点续传**
   - 切换 session 后从上次中断的位置继续
   - 任务进度保存在数据库中
   - 支持随时暂停和恢复

## 常见问题

### Q: 必须申请多个 API ID 吗？

A: 不是必须的。如果你只有一个账号，系统仍然可以正常工作，只是遇到限流时需要等待。

### Q: 使用同一个 API ID 登录多个账号有用吗？

A: 效果有限。限流主要针对 API ID，使用同一个 API ID 的多个账号仍然共享限流配额。

### Q: 环境变量配置的 session 还能用吗？

A: 可以。系统会优先使用环境变量配置的默认 session，同时也支持数据库中的 session。

### Q: 如何知道当前使用的是哪个 session？

A: 搬运任务的进度消息会显示当前使用的 session ID。

### Q: session 被限流后多久可以恢复？

A: 通常 30-60 秒，具体时间由 Telegram 服务器决定。系统会自动记录限流解除时间。

### Q: 可以手动选择使用哪个 session 吗？

A: 目前系统自动选择最佳 session。未来版本可能会支持手动选择。

## 技术细节

### 数据库表结构

```sql
CREATE TABLE userbot_sessions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_id INTEGER NOT NULL,
  api_hash VARCHAR(255) NOT NULL,
  session_string TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  flood_wait_until TIMESTAMP,
  last_used_at TIMESTAMP,
  total_transferred INTEGER DEFAULT 0,
  daily_transferred INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP DEFAULT NOW(),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 限流检测代码

参考 [src/userbot/transfer.ts:291-359](src/userbot/transfer.ts#L291-L359)

### Session 选择逻辑

参考 [src/services/sessionPool.ts](src/services/sessionPool.ts)

## 相关文档

- [README.md](README.md) - 项目总览
- [QUICK_START.md](QUICK_START.md) - 快速开始
- [MULTI_SESSION_GUIDE.md](MULTI_SESSION_GUIDE.md) - 多 Session 详细指南
- [TRANSFER_OPTIMIZATION.md](TRANSFER_OPTIMIZATION.md) - 搬运优化说明
