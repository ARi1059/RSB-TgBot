# 环境变量配置总结

## 配置文件变更概览

### 变更内容

本次更新主要涉及 Userbot Session 配置方式的变更：

- **旧版本**：通过环境变量配置单个 session
- **新版本**：通过数据库管理多个 session（向后兼容环境变量）

### 影响的文件

1. `.env.example` - 示例配置文件 ✅ 已更新
2. `.env.development` - 开发环境配置 ✅ 已更新
3. `.env.production` - 生产环境配置 ✅ 已更新

## 配置对比

### 旧版本配置（单 Session）

```env
# Userbot Configuration (optional, for auto-forwarding feature)
USERBOT_API_ID=23806065
USERBOT_API_HASH=1ab93f1fd16a384cd17b54e5e326ad74
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

**特点：**
- ✅ 简单直接
- ❌ 只能配置一个账号
- ❌ 遇到限流必须等待
- ❌ 无法动态管理

### 新版本配置（多 Session）

```env
# Userbot Configuration (optional, for auto-forwarding feature)
# 注意：新版本使用数据库管理多个 session，建议通过 Bot 的 "Session 管理" 菜单添加
# 以下配置为向后兼容的默认 session（可选）
USERBOT_API_ID=23806065
USERBOT_API_HASH=1ab93f1fd16a384cd17b54e5e326ad74
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

**特点：**
- ✅ 向后兼容旧配置
- ✅ 支持通过 Bot 添加更多账号
- ✅ 自动切换限流账号
- ✅ 动态管理账号池

## 你需要做什么？

### 选项 1：保持现有配置（最简单）

**适用场景：**
- 你只有一个 Telegram 账号
- 暂时不需要多账号功能
- 想先测试新版本

**操作步骤：**
1. **不需要修改任何配置文件**
2. 系统会继续使用环境变量中的 session
3. 未来需要时可以通过 Bot 添加更多账号

**优点：**
- 零配置，无需修改
- 立即可用
- 平滑升级

**缺点：**
- 仍然只有一个账号
- 遇到限流需要等待

---

### 选项 2：迁移到数据库管理（推荐）

**适用场景：**
- 需要多账号功能
- 想要自动切换限流账号
- 计划长期使用

**操作步骤：**

#### 步骤 1：通过 Bot 添加现有账号

```
1. 启动 Bot
2. 发送 /session 命令
3. 点击 [➕ 添加新账号]
4. 输入信息：
   - 账号名称：主账号
   - API ID：23806065（你的 USERBOT_API_ID）
   - API Hash：1ab93f1fd16a384cd17b54e5e326ad74（你的 USERBOT_API_HASH）
   - 优先级：10
   - 手机号：+86138xxxxxxxx
   - 验证码：收到的验证码
```

#### 步骤 2：验证账号已添加

```
1. 在 Bot 中选择 [📋 查看账号列表]
2. 确认看到你添加的账号
3. 状态应该是：✅ 🟢（已启用且可用）
```

#### 步骤 3：注释环境变量（可选）

编辑 `.env.development` 或 `.env.production`：

```env
# 已迁移到数据库管理，以下配置可以注释
# USERBOT_API_ID=23806065
# USERBOT_API_HASH=1ab93f1fd16a384cd17b54e5e326ad74
# USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

#### 步骤 4：重启 Bot

```bash
npm run dev
# 或
npm start
```

**优点：**
- 支持多账号
- 自动切换限流账号
- 通过 Bot 界面管理
- 实时查看统计

**缺点：**
- 需要手动迁移
- 需要重新登录验证

---

### 选项 3：添加更多账号（最佳）

**适用场景：**
- 需要规避限流
- 大量搬运任务
- 追求最佳性能

**前置条件：**
- 需要申请多个 API ID（每个需要独立的 Telegram 账号）

**操作步骤：**

#### 步骤 1：申请新的 API ID

为每个新账号：

1. 准备一个手机号（可以使用接码平台）
2. 注册新的 Telegram 账号
3. 访问 https://my.telegram.org/apps
4. 登录并申请 API ID
5. 记录 `api_id` 和 `api_hash`

#### 步骤 2：通过 Bot 添加所有账号

```
对于每个账号：
1. /session → [➕ 添加新账号]
2. 输入账号信息
3. 完成登录验证
4. 设置优先级（主力账号设置高优先级）
```

#### 步骤 3：配置优先级

建议配置：

```
账号1（主力）：priority=10
账号2（主力）：priority=9
账号3（备用）：priority=5
账号4（备用）：priority=3
```

#### 步骤 4：测试自动切换

```
1. 开始一个搬运任务
2. 观察日志中的 session 切换记录
3. 验证限流时自动切换
```

**优点：**
- 最佳性能
- 几乎不受限流影响
- 可以 24/7 运行
- 负载均衡

**缺点：**
- 需要多个手机号
- 配置较复杂
- 需要管理多个账号

## 配置检查清单

### 必须检查的项目

- [ ] 数据库已迁移（运行 `npx prisma migrate dev`）
- [ ] Prisma Client 已更新（运行 `npx prisma generate`）
- [ ] Bot 可以正常启动
- [ ] 可以访问 `/session` 命令

### 可选检查项目

- [ ] 已通过 Bot 添加至少一个 session
- [ ] 已测试搬运功能
- [ ] 已验证自动切换功能
- [ ] 已查看账号统计

## 常见问题

### Q1: 我必须修改 .env 文件吗？

**A:** 不是必须的。如果你保持现有配置不变，系统会继续使用环境变量中的 session。新版本完全向后兼容。

### Q2: 环境变量和数据库中的 session 会冲突吗？

**A:** 不会。系统会优先使用环境变量中的默认 session，同时也支持数据库中的 session。它们可以共存。

### Q3: 我可以只在数据库中管理 session，不使用环境变量吗？

**A:** 可以。注释掉 `.env` 中的 `USERBOT_*` 配置，系统会自动从数据库中选择可用的 session。

### Q4: 如何知道系统使用的是哪个 session？

**A:** 查看搬运任务的进度消息，会显示当前使用的 session ID。也可以在日志中查看。

### Q5: 我需要重新登录吗？

**A:**
- 如果保持环境变量配置：不需要
- 如果迁移到数据库管理：需要通过 Bot 重新登录验证

### Q6: 旧的 session string 还能用吗？

**A:** 可以。你可以继续在环境变量中使用，也可以通过 Bot 添加到数据库中。

## 推荐配置方案

### 个人用户（轻度使用）

```env
# 保持环境变量配置
USERBOT_API_ID=your_api_id
USERBOT_API_HASH=your_api_hash
USERBOT_SESSION=your_session_string
```

**说明：** 简单直接，适合偶尔使用。

---

### 小团队（中度使用）

**方案：** 环境变量 + 数据库各 1-2 个账号

```env
# 保留一个默认账号
USERBOT_API_ID=your_api_id
USERBOT_API_HASH=your_api_hash
USERBOT_SESSION=your_session_string
```

**同时：** 通过 Bot 添加 1-2 个备用账号

**说明：** 兼顾简单性和可靠性。

---

### 商业用户（重度使用）

**方案：** 纯数据库管理，3-5 个账号

```env
# 注释掉环境变量配置
# USERBOT_API_ID=xxx
# USERBOT_API_HASH=xxx
# USERBOT_SESSION=xxx
```

**同时：** 通过 Bot 添加 3-5 个账号，设置不同优先级

**说明：** 最佳性能，适合大量搬运。

## 迁移时间表

### 立即（必须）

- [x] 更新 `.env.example` 文件
- [x] 更新 `.env.development` 文件
- [x] 更新 `.env.production` 文件
- [x] 创建迁移文档

### 下次部署时（推荐）

- [ ] 运行数据库迁移
- [ ] 通过 Bot 添加第一个 session
- [ ] 测试搬运功能

### 未来（可选）

- [ ] 申请更多 API ID
- [ ] 添加更多 session 账号
- [ ] 优化优先级配置
- [ ] 监控账号使用情况

## 相关文档

- [MULTI_SESSION_MIGRATION.md](./MULTI_SESSION_MIGRATION.md) - 详细迁移指南
- [QUICK_START.md](./QUICK_START.md) - 快速开始
- [MULTI_SESSION_GUIDE.md](./MULTI_SESSION_GUIDE.md) - 功能详解
- [README.md](./README.md) - 项目总览

## 技术支持

如有问题，请：

1. 查看日志：`tail -f logs/app.log`
2. 检查数据库：`npx prisma studio`
3. 查看文档：阅读上述相关文档
4. 提交 Issue：在 GitHub 上报告问题

---

**总结：你的 .env 文件已经更新了注释说明，但实际配置值保持不变。你可以选择继续使用现有配置，或者迁移到数据库管理。两种方式都可以正常工作。**
