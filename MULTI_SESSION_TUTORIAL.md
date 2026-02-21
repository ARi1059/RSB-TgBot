# 多 Session 配置实战教程

## 🎬 教程概览

本教程将手把手教你如何从零开始配置多个 Telegram UserBot Session，实现自动限流切换和高效搬运。

**预计时间：** 30-60 分钟
**难度等级：** ⭐⭐⭐ 中级
**前置要求：**
- 已部署 RSB-TgBot
- 有 2-5 个 Telegram 账号（手机号）
- 基本的命令行操作能力

---

## 📚 第一部分：准备工作（10 分钟）

### 步骤 1.1：检查环境

打开终端，进入项目目录：

```bash
cd e:\RSB-TgBot

# 检查 Node.js 版本
node --version
# 应该显示 v16.x 或更高

# 检查数据库连接
npx prisma db pull
# 应该成功连接到数据库
```

**预期输出：**
```
✔ Introspected 5 models and wrote them into prisma\schema.prisma in 234ms
```

---

### 步骤 1.2：运行数据库迁移

```bash
# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate deploy
```

**预期输出：**
```
✔ Generated Prisma Client
✔ Applied 3 migrations
```

---

### 步骤 1.3：启动 Bot

```bash
# 开发模式
npm run dev

# 或生产模式
npm start
```

**预期输出：**
```
[INFO] Bot started successfully
[INFO] Listening for updates...
```

**✅ 检查点：** Bot 应该在 Telegram 中响应 `/start` 命令

---

## 🔑 第二部分：申请 API 凭证（15 分钟）

### 步骤 2.1：准备账号清单

创建一个表格记录你的账号信息：

| 序号 | 用途 | 手机号 | API ID | API Hash | 优先级 | 备注 |
|------|------|--------|--------|----------|--------|------|
| 1 | 主力 | +86 138 0013 8000 | ? | ? | 10 | 待申请 |
| 2 | 主力 | +86 138 0013 8001 | ? | ? | 9 | 待申请 |
| 3 | 备用 | +86 138 0013 8002 | ? | ? | 5 | 待申请 |

---

### 步骤 2.2：申请第一个 API ID

**操作步骤：**

1. 打开浏览器，访问 https://my.telegram.org/apps

2. 使用第一个手机号登录
   - 输入手机号：`+8613800138000`
   - 点击 "Next"
   - 输入收到的验证码

3. 点击 "API development tools"

4. 填写应用信息：
   ```
   App title: RSB Bot 1
   Short name: rsb_bot_1
   Platform: Other
   Description: Resource sharing bot
   ```

5. 点击 "Create application"

6. 记录 API 凭证：
   ```
   api_id: 12345678
   api_hash: abcdef1234567890abcdef1234567890
   ```

**⚠️ 重要：** 立即保存这些信息到安全的地方！

---

### 步骤 2.3：申请其他账号的 API ID

重复步骤 2.2，为每个账号申请 API ID。

**完成后的表格：**

| 序号 | 用途 | 手机号 | API ID | API Hash | 优先级 |
|------|------|--------|--------|----------|--------|
| 1 | 主力 | +86 138 0013 8000 | 12345678 | abcdef123... | 10 |
| 2 | 主力 | +86 138 0013 8001 | 23456789 | bcdef123... | 9 |
| 3 | 备用 | +86 138 0013 8002 | 34567890 | cdef123... | 5 |

**✅ 检查点：** 所有账号都已获得 API ID 和 API Hash

---

## 🤖 第三部分：通过 Bot 添加 Session（20 分钟）

### 步骤 3.1：进入 Session 管理

在 Telegram 中：

1. 找到你的 Bot
2. 发送命令：`/session`

**Bot 响应：**
```
🔐 Session 账号管理

📊 当前状态：
• 总账号数：0
• 已启用：0
• 可用：0
• 限流中：0

请选择操作：
[📋 查看账号列表] [➕ 添加新账号]
[📊 账号统计] [🔙 返回主菜单]
```

---

### 步骤 3.2：添加第一个账号（主力账号1）

**操作流程：**

1. 点击 `[➕ 添加新账号]`

2. Bot 提示：`请输入账号名称（用于识别）：`
   - 你输入：`主力账号1`

3. Bot 提示：`请输入 API ID：`
   - 你输入：`12345678`

4. Bot 提示：`请输入 API Hash：`
   - 你输入：`abcdef1234567890abcdef1234567890`

5. Bot 提示：`请输入优先级（数字越大优先级越高，默认 0）：`
   - 你输入：`10`

6. Bot 提示：`🔐 开始登录流程...`
   Bot 提示：`请输入手机号（国际格式，如 +8613800138000）：`
   - 你输入：`+8613800138000`

7. Bot 提示：`📱 验证码已发送，请输入验证码：`
   - 你的手机收到验证码：`12345`
   - 你输入：`12345`

8. 如果有两步验证：
   Bot 提示：`🔒 需要两步验证密码，请输入：`
   - 你输入：`your_password`

9. Bot 响应：`✅ 账号 "主力账号1" 添加成功！`

**✅ 检查点：** 第一个账号添加成功

---

### 步骤 3.3：添加第二个账号（主力账号2）

重复步骤 3.2，使用第二个账号的信息：

```
账号名称：主力账号2
API ID：23456789
API Hash：bcdef1234567890abcdef12345678901
优先级：9
手机号：+8613800138001
验证码：（收到的验证码）
```

**Bot 响应：** `✅ 账号 "主力账号2" 添加成功！`

---

### 步骤 3.4：添加第三个账号（备用账号1）

继续添加第三个账号：

```
账号名称：备用账号1
API ID：34567890
API Hash：cdef1234567890abcdef123456789012
优先级：5
手机号：+8613800138002
验证码：（收到的验证码）
```

**Bot 响应：** `✅ 账号 "备用账号1" 添加成功！`

---

### 步骤 3.5：验证所有账号

1. 发送命令：`/session`
2. 点击 `[📋 查看账号列表]`

**Bot 显示：**
```
📋 Session 账号列表

✅ 🟢 #1 主力账号1
  📊 总转发：0 | 今日：0
  🎯 优先级：10

✅ 🟢 #2 主力账号2
  📊 总转发：0 | 今日：0
  🎯 优先级：9

✅ 🟢 #3 备用账号1
  📊 总转发：0 | 今日：0
  🎯 优先级：5

[🔙 返回]
```

**✅ 检查点：** 所有账号状态都是 ✅ 🟢

---

## 🚀 第四部分：测试自动切换（15 分钟）

### 步骤 4.1：开始第一次搬运

1. 发送命令：`/transfer`

2. 选择搬运模式：`[📅 按日期范围搬运]`

3. 输入源频道：`@test_channel`

4. 选择日期范围：
   - 开始日期：`2026-02-01`
   - 结束日期：`2026-02-21`

5. 选择内容类型：`[📷 图片] [🎬 视频]`

6. 输入关键字：`测试`

7. 输入合集标题：`测试搬运`

8. 确认开始搬运

**Bot 显示：**
```
🚀 搬运中...

📦 批次：1 (0/300)
✅ 已扫描：50 条消息
🔍 匹配关键字：12 条
📥 已转发：12 个文件
🔄 Session: 1
⏱️ 用时：30秒
```

**说明：** 注意 `🔄 Session: 1`，表示正在使用账号 1（主力账号1）

---

### 步骤 4.2：观察自动切换

继续观察搬运进度。如果账号 1 被限流，你会看到：

**Bot 显示：**
```
🔄 已切换账号继续搬运

📦 批次：1 (85/300)
✅ 已扫描：250 条消息
🔍 匹配关键字：85 条
📥 已转发：85 个文件
🔄 Session: 2
```

**说明：** `🔄 Session: 2` 表示已切换到账号 2（主力账号2）

---

### 步骤 4.3：查看日志

打开终端，查看详细日志：

```bash
# 查看实时日志
tail -f logs/app.log

# 或查看限流记录
grep "FloodWait" logs/app.log

# 查看切换记录
grep "Switched from session" logs/app.log
```

**日志示例：**
```
[2026-02-21 19:45:30] [WARN] Session 1 hit FloodWait, need to wait 60 seconds
[2026-02-21 19:45:31] [INFO] Attempting to switch to another available session...
[2026-02-21 19:45:32] [INFO] ✅ Switched from session 1 to session 2
[2026-02-21 19:45:33] [INFO] Using session 2 for transfer task 1
```

**✅ 检查点：** 看到自动切换的日志记录

---

### 步骤 4.4：查看账号状态

搬运过程中，发送命令：`/session`，点击 `[📋 查看账号列表]`

**Bot 显示：**
```
📋 Session 账号列表

✅ 🔴 #1 主力账号1
  📊 总转发：85 | 今日：85
  🎯 优先级：10
  ⏳ 限流至：2026-02-21 19:46:30

✅ 🟢 #2 主力账号2
  📊 总转发：45 | 今日：45
  🎯 优先级：9

✅ 🟢 #3 备用账号1
  📊 总转发：0 | 今日：0
  🎯 优先级：5
```

**说明：**
- 账号 1 显示 🔴（限流中）
- 账号 2 显示 🟢（正在使用）
- 账号 3 显示 🟢（待命）

---

### 步骤 4.5：等待限流解除

等待约 1 分钟后，再次查看账号列表：

**Bot 显示：**
```
📋 Session 账号列表

✅ 🟢 #1 主力账号1
  📊 总转发：85 | 今日：85
  🎯 优先级：10

✅ 🟢 #2 主力账号2
  📊 总转发：120 | 今日：120
  🎯 优先级：9

✅ 🟢 #3 备用账号1
  📊 总转发：0 | 今日：0
  🎯 优先级：5
```

**说明：** 账号 1 已恢复为 🟢（可用）

**✅ 检查点：** 限流自动解除，账号恢复可用

---

## 📊 第五部分：查看统计和管理（10 分钟）

### 步骤 5.1：查看账号统计

1. 发送命令：`/session`
2. 点击 `[📊 账号统计]`

**Bot 显示：**
```
📊 Session 账号统计

📈 总体统计：
• 总账号数：3
• 已启用：3
• 可用：3
• 限流中：0

📦 转发统计：
• 总转发数：205
• 今日转发：205
• 平均每账号：68
```

---

### 步骤 5.2：调整账号优先级

如果你想调整优先级，目前需要删除后重新添加：

1. 点击 `[📋 查看账号列表]`
2. 找到要调整的账号，点击 `[🗑️ 删除]`
3. 确认删除
4. 重新添加该账号，设置新的优先级

**未来版本：** 将支持直接修改优先级

---

### 步骤 5.3：禁用/启用账号

如果某个账号需要维护，可以临时禁用：

1. 点击 `[📋 查看账号列表]`
2. 找到要禁用的账号
3. 点击 `[🔴 禁用]`

**Bot 响应：** `✅ 账号已禁用`

**账号列表更新：**
```
❌ 🟢 #3 备用账号1 (已禁用)
  📊 总转发：0 | 今日：0
  🎯 优先级：5
```

**重新启用：**
1. 点击 `[🟢 启用]`
2. Bot 响应：`✅ 账号已启用`

---

### 步骤 5.4：删除账号

如果某个账号不再需要：

1. 点击 `[📋 查看账号列表]`
2. 找到要删除的账号
3. 点击 `[🗑️ 删除]`

**Bot 显示确认：**
```
⚠️ 确认删除账号？

账号名称：备用账号1
总转发数：0

此操作不可恢复！

[✅ 确认删除] [❌ 取消]
```

4. 点击 `[✅ 确认删除]`

**Bot 响应：** `✅ 账号已删除`

---

## 🎯 第六部分：高级配置（可选）

### 步骤 6.1：调整速率参数

编辑 `src/constants/index.ts`：

```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 300,              // 每批次 300 个文件
  FORWARD_RATE: 2000,           // 每 2 秒转发一个文件
  PAUSE_AFTER_FILES: 30,        // 每 30 个文件暂停
  PAUSE_DURATION: 20000,        // 暂停 20 秒
  LONG_PAUSE_AFTER_FILES: 120,  // 每 120 个文件长暂停
  LONG_PAUSE_DURATION: 90000,   // 长暂停 90 秒
  PROGRESS_UPDATE_INTERVAL: 10  // 每 10 个文件更新进度
};
```

**重启 Bot：**
```bash
# Ctrl+C 停止
# 重新启动
npm run dev
```

---

### 步骤 6.2：配置环境变量（可选）

如果你想保留一个默认账号在环境变量中：

编辑 `.env` 文件：

```env
# 默认 Session（可选）
USERBOT_API_ID=12345678
USERBOT_API_HASH=abcdef1234567890abcdef1234567890
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

**说明：** 系统会优先使用环境变量中的 session，同时也支持数据库中的 session

---

### 步骤 6.3：设置定时任务（可选）

创建定时任务自动重置每日统计：

**Linux/Mac (crontab)：**
```bash
# 编辑 crontab
crontab -e

# 添加任务（每天凌晨 0:00 执行）
0 0 * * * cd /path/to/RSB-TgBot && node scripts/reset-daily-stats.js
```

**Windows (任务计划程序)：**
1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器：每天 0:00
4. 操作：启动程序
   - 程序：`node`
   - 参数：`scripts/reset-daily-stats.js`
   - 起始于：`E:\RSB-TgBot`

---

## 🔍 第七部分：故障排查

### 问题 1：添加账号时报错

**错误信息：**
```
❌ 登录失败：PHONE_CODE_INVALID
```

**解决方案：**
1. 检查验证码是否正确
2. 验证码可能已过期，重新获取
3. 确认手机号格式正确（+86 开头）

---

### 问题 2：所有账号都被限流

**Bot 显示：**
```
⚠️ 所有账号均被限流，已暂停
```

**解决方案：**
1. 降低 `FORWARD_RATE`（增加间隔）
2. 增加 `PAUSE_DURATION`（延长暂停）
3. 等待限流解除（通常 30-60 分钟）
4. 添加更多账号

---

### 问题 3：账号频繁限流

**现象：** 某个账号经常被限流

**解决方案：**
1. 检查是否是新注册的账号
2. 使用真实手机号注册的老账号
3. 降低该账号的优先级
4. 或直接禁用该账号

---

### 问题 4：无法切换账号

**日志显示：**
```
[ERROR] Failed to switch to another session
```

**解决方案：**
1. 检查是否有可用账号：`/session` → `[📋 查看账号列表]`
2. 确认至少有一个账号是 🟢 状态
3. 检查数据库连接
4. 查看详细日志：`tail -f logs/app.log`

---

## ✅ 完成检查清单

配置完成后，确认以下项目：

- [ ] 已添加至少 2 个 Session 账号
- [ ] 所有账号状态为 ✅ 🟢
- [ ] 已测试搬运功能
- [ ] 已观察到自动切换
- [ ] 已查看账号统计
- [ ] 已调整速率参数（如需要）
- [ ] 已设置定时任务（可选）
- [ ] 已备份账号信息

---

## 📈 性能优化建议

### 根据账号数量优化

**2-3 个账号：**
```typescript
FORWARD_RATE: 1800,
PAUSE_AFTER_FILES: 40,
PAUSE_DURATION: 18000,
```

**4-5 个账号：**
```typescript
FORWARD_RATE: 2000,
PAUSE_AFTER_FILES: 30,
PAUSE_DURATION: 20000,
```

**6+ 个账号：**
```typescript
FORWARD_RATE: 2500,
PAUSE_AFTER_FILES: 20,
PAUSE_DURATION: 30000,
```

---

## 🎓 进阶技巧

### 技巧 1：优先级策略

```
主力账号（高频使用）：priority = 10, 9, 8
备用账号（中频使用）：priority = 5, 4, 3
应急账号（低频使用）：priority = 1, 0
```

### 技巧 2：负载均衡

系统会自动选择：
1. 优先级最高的账号
2. 相同优先级时，选择今日转发数最少的

### 技巧 3：监控告警

定期检查：
```bash
# 查看限流记录
grep "FloodWait" logs/app.log | tail -20

# 查看切换记录
grep "Switched" logs/app.log | tail -20

# 查看错误记录
grep "ERROR" logs/app.log | tail -20
```

---

## 📚 相关文档

- [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) - 快速配置指南
- [MULTI_SESSION_DATABASE_EXAMPLES.md](MULTI_SESSION_DATABASE_EXAMPLES.md) - 数据库示例
- [.env.multi-session.example](.env.multi-session.example) - 详细配置示例
- [MULTI_SESSION_GUIDE.md](MULTI_SESSION_GUIDE.md) - 功能详细指南
- [MULTI_SESSION_BEST_PRACTICES.md](MULTI_SESSION_BEST_PRACTICES.md) - 最佳实践

---

## 🎉 恭喜！

你已经成功配置了多 Session 账号池！现在你可以：

✅ 使用多个账号进行搬运
✅ 自动切换限流账号
✅ 查看账号统计和状态
✅ 管理和维护账号池

**下一步：**
1. 开始大规模搬运任务
2. 监控账号使用情况
3. 根据需要添加更多账号
4. 优化速率参数

**祝使用愉快！** 🚀
