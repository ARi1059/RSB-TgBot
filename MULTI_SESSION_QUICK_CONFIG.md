# 多 Session 快速配置指南

## 📋 配置清单

### 方案选择

根据你的使用场景选择合适的方案：

| 方案 | 账号数量 | 适用场景 | 每日搬运量 |
|------|---------|---------|-----------|
| 单 Session | 1 个 | 个人轻度使用 | < 500 文件 |
| 混合模式 | 2-3 个 | 小团队使用 | 500-2000 文件 |
| 多 Session | 4-8 个 | 商业/重度使用 | > 2000 文件 |

---

## 🚀 方案 A：单 Session（最简单）

### 配置步骤

**1. 准备材料**
- 1 个 Telegram 账号（手机号）
- 1 个 API ID 和 API Hash

**2. 申请 API 凭证**
```
访问：https://my.telegram.org/apps
登录你的 Telegram 账号
填写应用信息：
  - App title: My Bot
  - Short name: mybot
  - Platform: Other
获得：api_id 和 api_hash
```

**3. 配置方式（二选一）**

**选项 1：环境变量配置**
```env
# .env 文件
USERBOT_API_ID=12345678
USERBOT_API_HASH=abcdef1234567890abcdef1234567890
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

**选项 2：通过 Bot 添加**
```
1. 启动 Bot
2. 发送 /session
3. 点击 [➕ 添加新账号]
4. 输入：
   - 账号名称：主账号
   - API ID：12345678
   - API Hash：abcdef1234567890abcdef1234567890
   - 优先级：10
   - 手机号：+8613800138000
   - 验证码：（收到的验证码）
```

**4. 验证**
```bash
npm run dev
# 测试搬运功能
```

---

## 🔄 方案 B：混合模式（推荐新手）

### 配置步骤

**1. 准备材料**
- 2-3 个 Telegram 账号
- 2-3 个 API ID 和 API Hash

**2. 配置默认账号（环境变量）**
```env
# .env 文件
USERBOT_API_ID=12345678
USERBOT_API_HASH=abcdef1234567890abcdef1234567890
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

**3. 通过 Bot 添加备用账号**

**账号 2（备用）：**
```
/session → [➕ 添加新账号]
- 账号名称：备用账号1
- API ID：23456789
- API Hash：bcdef1234567890abcdef12345678901
- 优先级：5
- 手机号：+8613800138001
- 验证码：（收到的验证码）
```

**账号 3（备用）：**
```
/session → [➕ 添加新账号]
- 账号名称：备用账号2
- API ID：34567890
- API Hash：cdef1234567890abcdef123456789012
- 优先级：3
- 手机号：+8613800138002
- 验证码：（收到的验证码）
```

**4. 验证配置**
```
/session → [📋 查看账号列表]

应该看到：
✅ 🟢 #1 备用账号1
✅ 🟢 #2 备用账号2
```

---

## 🏢 方案 C：多 Session（推荐生产）

### 配置步骤

**1. 准备材料**
- 5 个 Telegram 账号
- 5 个 API ID 和 API Hash

**2. 不使用环境变量**
```env
# .env 文件
# 注释掉 USERBOT 配置
# USERBOT_API_ID=xxx
# USERBOT_API_HASH=xxx
# USERBOT_SESSION=xxx
```

**3. 通过 Bot 添加所有账号**

**账号 1（主力）：**
```
- 账号名称：主力账号1
- API ID：12345678
- API Hash：abcdef1234567890abcdef1234567890
- 优先级：10
- 手机号：+8613800138000
```

**账号 2（主力）：**
```
- 账号名称：主力账号2
- API ID：23456789
- API Hash：bcdef1234567890abcdef12345678901
- 优先级：9
- 手机号：+8613800138001
```

**账号 3（备用）：**
```
- 账号名称：备用账号1
- API ID：34567890
- API Hash：cdef1234567890abcdef123456789012
- 优先级：5
- 手机号：+8613800138002
```

**账号 4（备用）：**
```
- 账号名称：备用账号2
- API ID：45678901
- API Hash：def1234567890abcdef1234567890123
- 优先级：3
- 手机号：+8613800138003
```

**账号 5（应急）：**
```
- 账号名称：应急账号
- API ID：56789012
- API Hash：ef1234567890abcdef12345678901234
- 优先级：1
- 手机号：+8613800138004
```

**4. 验证配置**
```
/session → [📋 查看账号列表]

应该看到：
✅ 🟢 #1 主力账号1 (优先级: 10)
✅ 🟢 #2 主力账号2 (优先级: 9)
✅ 🟢 #3 备用账号1 (优先级: 5)
✅ 🟢 #4 备用账号2 (优先级: 3)
✅ 🟢 #5 应急账号 (优先级: 1)
```

**5. 测试自动切换**
```
1. 开始搬运任务：/transfer
2. 观察进度消息中的 Session ID
3. 系统会自动使用优先级最高的可用账号
4. 限流时自动切换到下一个账号
```

---

## 📊 优先级设置建议

### 优先级规则

- **数字越大，优先级越高**
- 系统优先选择优先级高的账号
- 相同优先级时，选择使用次数少的账号

### 推荐配置

**小规模（2 个账号）：**
```
主力账号：priority = 10
备用账号：priority = 5
```

**中规模（4 个账号）：**
```
主力账号1：priority = 10
主力账号2：priority = 9
备用账号1：priority = 5
备用账号2：priority = 3
```

**大规模（5-8 个账号）：**
```
主力账号1：priority = 10
主力账号2：priority = 9
主力账号3：priority = 8
备用账号1：priority = 5
备用账号2：priority = 4
备用账号3：priority = 3
应急账号1：priority = 1
应急账号2：priority = 0
```

---

## 🔧 速率配置

根据账号数量调整速率参数（编辑 `src/constants/index.ts`）：

### 单 Session（1 个账号）
```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 500,              // 每批次文件数
  FORWARD_RATE: 1500,           // 转发间隔（毫秒）
  PAUSE_AFTER_FILES: 50,        // 每 N 个文件暂停
  PAUSE_DURATION: 15000,        // 暂停时长（毫秒）
  LONG_PAUSE_AFTER_FILES: 200,  // 每 N 个文件长暂停
  LONG_PAUSE_DURATION: 60000,   // 长暂停时长（毫秒）
  PROGRESS_UPDATE_INTERVAL: 10  // 进度更新间隔
};
```

### 混合模式（2-3 个账号）
```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 400,
  FORWARD_RATE: 1800,
  PAUSE_AFTER_FILES: 40,
  PAUSE_DURATION: 18000,
  LONG_PAUSE_AFTER_FILES: 160,
  LONG_PAUSE_DURATION: 75000,
  PROGRESS_UPDATE_INTERVAL: 10
};
```

### 多 Session（4-8 个账号）
```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 300,
  FORWARD_RATE: 2000,
  PAUSE_AFTER_FILES: 30,
  PAUSE_DURATION: 20000,
  LONG_PAUSE_AFTER_FILES: 120,
  LONG_PAUSE_DURATION: 90000,
  PROGRESS_UPDATE_INTERVAL: 10
};
```

### 激进模式（8+ 个账号，风险高）
```typescript
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 200,
  FORWARD_RATE: 2500,
  PAUSE_AFTER_FILES: 20,
  PAUSE_DURATION: 30000,
  LONG_PAUSE_AFTER_FILES: 80,
  LONG_PAUSE_DURATION: 180000,
  PROGRESS_UPDATE_INTERVAL: 5
};
```

---

## 📝 配置检查清单

### 部署前检查

- [ ] 数据库已配置（DATABASE_URL）
- [ ] 已运行数据库迁移（`npx prisma migrate dev`）
- [ ] 已更新 Prisma Client（`npx prisma generate`）
- [ ] Bot Token 已配置
- [ ] 管理员 ID 已配置
- [ ] 代理已配置（如需要）

### Session 配置检查

- [ ] 已准备足够数量的 Telegram 账号
- [ ] 已为每个账号申请 API ID
- [ ] 已通过 Bot 添加所有账号
- [ ] 所有账号状态为 ✅ 🟢
- [ ] 优先级设置合理
- [ ] 已测试搬运功能

### 速率配置检查

- [ ] 已根据账号数量调整速率参数
- [ ] FORWARD_RATE 设置合理（不要太快）
- [ ] BATCH_SIZE 设置合理
- [ ] 暂停策略设置合理

---

## 🎯 实战示例

### 示例 1：个人用户（1 个账号）

**场景：** 偶尔搬运一些资源，每天 < 500 个文件

**配置：**
```env
# .env
USERBOT_API_ID=12345678
USERBOT_API_HASH=abcdef1234567890abcdef1234567890
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

**速率：** 保守模式（FORWARD_RATE: 1500）

**结果：** 简单可靠，适合轻度使用

---

### 示例 2：小团队（3 个账号）

**场景：** 团队共用，每天 1000-2000 个文件

**配置：**
```
环境变量：1 个默认账号（priority=10）
Bot 添加：2 个备用账号（priority=5, 3）
```

**速率：** 标准模式（FORWARD_RATE: 1800）

**结果：** 兼顾简单性和可靠性，限流时自动切换

---

### 示例 3：商业用户（5 个账号）

**场景：** 商业运营，每天 > 3000 个文件

**配置：**
```
通过 Bot 添加 5 个账号：
- 主力账号1：priority=10
- 主力账号2：priority=9
- 备用账号1：priority=5
- 备用账号2：priority=3
- 应急账号：priority=1
```

**速率：** 激进模式（FORWARD_RATE: 2000）

**结果：** 最佳性能，几乎不受限流影响

---

## 🔍 故障排查

### 问题 1：无法添加账号

**症状：** 点击添加账号后报错

**可能原因：**
- API ID 或 API Hash 错误
- 网络连接问题
- 代理配置错误

**解决方案：**
```
1. 检查 API 凭证是否正确
2. 确认网络连接正常
3. 检查代理配置（如使用代理）
4. 查看日志：tail -f logs/app.log
```

---

### 问题 2：所有账号都被限流

**症状：** 搬运任务暂停，提示所有账号限流

**可能原因：**
- 速率设置过快
- 账号质量差（新账号）
- 短时间内大量操作

**解决方案：**
```
1. 降低 FORWARD_RATE（增加间隔时间）
2. 增加 PAUSE_DURATION（延长暂停时间）
3. 使用真实活跃的账号
4. 等待限流解除（通常 30-60 分钟）
5. 添加更多账号
```

---

### 问题 3：账号频繁限流

**症状：** 某个账号经常被限流

**可能原因：**
- 新注册的账号
- 账号异常（被标记）
- 使用虚拟号码

**解决方案：**
```
1. 禁用该账号：/session → 点击禁用按钮
2. 使用真实手机号注册的账号
3. 使用活跃的老账号
4. 降低该账号的优先级
```

---

### 问题 4：切换失败

**症状：** 限流后无法切换到其他账号

**可能原因：**
- 没有可用的账号
- 所有账号都被限流
- 数据库连接问题

**解决方案：**
```
1. 检查账号列表：/session → [📋 查看账号列表]
2. 确认有可用账号（🟢 状态）
3. 添加更多账号
4. 检查数据库连接
5. 查看日志：grep "Switched from session" logs/app.log
```

---

## 📚 相关文档

- [README.md](README.md) - 项目总览
- [QUICK_START.md](QUICK_START.md) - 快速开始
- [MULTI_SESSION_MIGRATION.md](MULTI_SESSION_MIGRATION.md) - 配置迁移指南
- [MULTI_SESSION_GUIDE.md](MULTI_SESSION_GUIDE.md) - 功能详细指南
- [MULTI_SESSION_BEST_PRACTICES.md](MULTI_SESSION_BEST_PRACTICES.md) - 最佳实践
- [ENV_CONFIG_SUMMARY.md](ENV_CONFIG_SUMMARY.md) - 环境变量配置总结
- [.env.multi-session.example](.env.multi-session.example) - 详细配置示例

---

## 💡 小贴士

1. **从小开始**：先配置 1-2 个账号测试，确认正常后再添加更多
2. **真实账号**：使用真实手机号注册的活跃账号，避免新账号
3. **合理速率**：不要设置过快的速率，宁可慢一点也不要被限流
4. **定期检查**：每天查看账号状态，及时发现问题
5. **备份数据**：定期备份数据库，防止数据丢失
6. **监控日志**：关注日志中的限流和切换记录
7. **优先级策略**：主力账号设置高优先级，备用账号设置低优先级
8. **分批搬运**：大量文件分批搬运，避免一次性搬运太多

---

**祝配置顺利！** 🚀
