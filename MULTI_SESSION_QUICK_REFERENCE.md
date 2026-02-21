# 多 Session 配置快速参考卡片

> 🚀 快速查找你需要的信息

## 📌 我想...

### 快速开始

| 我想... | 查看文档 | 预计时间 |
|---------|---------|---------|
| **5分钟快速上手** | [QUICK_START.md](QUICK_START.md) | 5-10分钟 |
| **了解有哪些方案** | [MULTI_SESSION_COMPARISON.md](MULTI_SESSION_COMPARISON.md) | 10分钟 |
| **看完整的教程** | [MULTI_SESSION_TUTORIAL.md](MULTI_SESSION_TUTORIAL.md) | 30-60分钟 |
| **查看配置示例** | [.env.multi-session.example](.env.multi-session.example) | 按需查阅 |

### 配置和迁移

| 我想... | 查看文档 | 章节 |
|---------|---------|------|
| **从旧版本升级** | [MULTI_SESSION_MIGRATION.md](MULTI_SESSION_MIGRATION.md) | 迁移步骤 |
| **配置单个账号** | [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) | 方案 A |
| **配置2-3个账号** | [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) | 方案 B |
| **配置5-8个账号** | [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) | 方案 C |
| **申请 API ID** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q5 |
| **设置优先级** | [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) | 优先级设置 |

### 问题解决

| 我遇到... | 查看文档 | 章节 |
|----------|---------|------|
| **添加账号报错** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q22-Q23 |
| **所有账号限流** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q14 |
| **账号频繁限流** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q15 |
| **无法切换账号** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q24 |
| **任务中断了** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q25 |
| **数据库连接失败** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q26 |
| **不知道什么问题** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | 全部35个问题 |

### 优化和进阶

| 我想... | 查看文档 | 章节 |
|---------|---------|------|
| **提高搬运速度** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q16 |
| **调整速率参数** | [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) | Q17 |
| **优化配置** | [MULTI_SESSION_BEST_PRACTICES.md](MULTI_SESSION_BEST_PRACTICES.md) | 性能优化 |
| **了解工作原理** | [MULTI_SESSION_FLOWCHARTS.md](MULTI_SESSION_FLOWCHARTS.md) | 全部流程图 |
| **查看数据库操作** | [MULTI_SESSION_DATABASE_EXAMPLES.md](MULTI_SESSION_DATABASE_EXAMPLES.md) | SQL示例 |

---

## 🎯 按角色查找

### 我是新手

**推荐路径：**
```
1. MULTI_SESSION_README.md (5分钟) - 了解概况
2. QUICK_START.md (10分钟) - 快速上手
3. MULTI_SESSION_COMPARISON.md (10分钟) - 选择方案
4. MULTI_SESSION_QUICK_CONFIG.md (20分钟) - 开始配置
```

**总时间：** 45分钟

---

### 我要升级

**推荐路径：**
```
1. MULTI_SESSION_MIGRATION.md (20分钟) - 迁移指南
2. ENV_CONFIG_SUMMARY.md (10分钟) - 配置变更
3. DATABASE_MIGRATION.md (15分钟) - 数据库迁移
4. MULTI_SESSION_QUICK_CONFIG.md (20分钟) - 完成配置
```

**总时间：** 1-2小时

---

### 我是开发者

**推荐路径：**
```
1. IMPLEMENTATION_SUMMARY.md (30分钟) - 实现总结
2. MULTI_SESSION_DATABASE_EXAMPLES.md (20分钟) - 数据库示例
3. MULTI_SESSION_FLOWCHARTS.md (30分钟) - 工作流程
4. MULTI_SESSION_GUIDE.md (30分钟) - 功能指南
```

**总时间：** 2小时

---

### 我遇到问题

**推荐路径：**
```
1. MULTI_SESSION_FAQ.md - 查找相关问题
2. 查看日志：tail -f logs/app.log
3. MULTI_SESSION_BEST_PRACTICES.md - 故障排查
4. 提交 Issue 到 GitHub
```

---

## 📊 快速对比

### 3种配置方案

| 特性 | 单 Session | 混合模式 | 多 Session |
|------|-----------|---------|-----------|
| **账号数量** | 1个 | 2-3个 | 5-8个 |
| **配置难度** | ⭐ 简单 | ⭐⭐ 中等 | ⭐⭐⭐ 复杂 |
| **每日搬运** | <500 | 500-2000 | >2000 |
| **限流影响** | 大 | 中 | 小 |
| **适用场景** | 个人 | 小团队 | 商业 |

**详细对比：** [MULTI_SESSION_COMPARISON.md](MULTI_SESSION_COMPARISON.md)

---

## 🔧 常用命令

### Bot 命令

```bash
/session          # Session 管理
/transfer         # 开始搬运
/start            # 启动 Bot
```

### 数据库命令

```bash
npx prisma migrate dev    # 运行迁移
npx prisma generate       # 生成客户端
npx prisma studio         # 查看数据库
```

### 日志查看

```bash
tail -f logs/app.log                    # 实时日志
grep "FloodWait" logs/app.log           # 限流记录
grep "Switched from session" logs/app.log  # 切换记录
grep "ERROR" logs/app.log               # 错误记录
```

---

## 📝 配置速查

### 环境变量（单 Session）

```env
USERBOT_API_ID=12345678
USERBOT_API_HASH=abcdef1234567890abcdef1234567890
USERBOT_SESSION=1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==
```

### 速率参数（保守模式）

```typescript
TRANSFER_CONFIG = {
  BATCH_SIZE: 500,
  FORWARD_RATE: 1500,
  PAUSE_AFTER_FILES: 50,
  PAUSE_DURATION: 15000,
};
```

### 速率参数（标准模式）

```typescript
TRANSFER_CONFIG = {
  BATCH_SIZE: 300,
  FORWARD_RATE: 2000,
  PAUSE_AFTER_FILES: 30,
  PAUSE_DURATION: 20000,
};
```

### 速率参数（激进模式）

```typescript
TRANSFER_CONFIG = {
  BATCH_SIZE: 200,
  FORWARD_RATE: 2500,
  PAUSE_AFTER_FILES: 20,
  PAUSE_DURATION: 30000,
};
```

---

## 🚨 常见错误

### PHONE_CODE_INVALID

**原因：** 验证码错误或过期

**解决：**
1. 检查验证码是否正确
2. 重新获取验证码
3. 确认手机号格式（+86开头）

---

### API_ID_INVALID

**原因：** API ID 或 API Hash 错误

**解决：**
1. 检查 API ID 是否为纯数字
2. 检查 API Hash 是否完整
3. 重新申请 API 凭证

---

### FloodWait

**原因：** 触发 Telegram 限流

**解决：**
1. 系统会自动切换账号
2. 或等待限流解除（30-60秒）
3. 降低 FORWARD_RATE

---

### 无可用账号

**原因：** 所有账号都被限流或禁用

**解决：**
1. 等待限流解除
2. 添加更多账号
3. 检查账号状态

---

## 💡 快速技巧

### 技巧 1：优先级设置

```
主力账号：priority = 10, 9, 8
备用账号：priority = 5, 4, 3
应急账号：priority = 1, 0
```

### 技巧 2：查看账号状态

```
/session → [📋 查看账号列表]

✅ 🟢 = 已启用且可用
✅ 🔴 = 已启用但限流中
❌ 🟢 = 已禁用
```

### 技巧 3：手动重置限流

```
/session → [📋 查看账号列表] → [🔄 重置限流]
```

### 技巧 4：查看统计

```
/session → [📊 账号统计]

显示：
- 总账号数
- 可用账号数
- 总转发数
- 今日转发数
```

---

## 📚 完整文档列表

### 用户文档（9篇）

1. [MULTI_SESSION_README.md](MULTI_SESSION_README.md) - 完整导航
2. [QUICK_START.md](QUICK_START.md) - 快速开始
3. [MULTI_SESSION_COMPARISON.md](MULTI_SESSION_COMPARISON.md) - 方案对比
4. [MULTI_SESSION_MIGRATION.md](MULTI_SESSION_MIGRATION.md) - 配置迁移
5. [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) - 快速配置
6. [MULTI_SESSION_TUTORIAL.md](MULTI_SESSION_TUTORIAL.md) - 实战教程
7. [MULTI_SESSION_GUIDE.md](MULTI_SESSION_GUIDE.md) - 功能指南
8. [MULTI_SESSION_BEST_PRACTICES.md](MULTI_SESSION_BEST_PRACTICES.md) - 最佳实践
9. [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md) - 常见问题

### 技术文档（4篇）

1. [MULTI_SESSION_DATABASE_EXAMPLES.md](MULTI_SESSION_DATABASE_EXAMPLES.md) - 数据库示例
2. [MULTI_SESSION_FLOWCHARTS.md](MULTI_SESSION_FLOWCHARTS.md) - 工作流程图
3. [MULTI_SESSION_COMPLETION_REPORT.md](MULTI_SESSION_COMPLETION_REPORT.md) - 完成报告
4. [ENV_CONFIG_SUMMARY.md](ENV_CONFIG_SUMMARY.md) - 配置总结

### 配置示例（2个）

1. [.env.example](.env.example) - 基础配置
2. [.env.multi-session.example](.env.multi-session.example) - 详细配置

---

## 🔗 快速链接

### 项目链接

- **GitHub**: https://github.com/ARi1059/RSB-TgBot
- **Issues**: https://github.com/ARi1059/RSB-TgBot/issues

### 外部资源

- **Telegram API**: https://core.telegram.org/api
- **申请 API ID**: https://my.telegram.org/apps
- **Prisma 文档**: https://www.prisma.io/docs

---

## 📞 获取帮助

### 步骤 1：查看文档

- 先查看 [MULTI_SESSION_FAQ.md](MULTI_SESSION_FAQ.md)
- 35个常见问题可能已有答案

### 步骤 2：查看日志

```bash
tail -f logs/app.log
```

### 步骤 3：检查配置

- 确认 `.env` 配置正确
- 确认数据库连接正常
- 确认账号状态正常

### 步骤 4：提交 Issue

- 访问 GitHub Issues
- 描述问题和错误信息
- 附上相关日志

---

## ✨ 快速开始（3步）

### 第1步：选择方案

访问 [MULTI_SESSION_COMPARISON.md](MULTI_SESSION_COMPARISON.md) 选择适合你的方案

### 第2步：跟随教程

访问 [MULTI_SESSION_TUTORIAL.md](MULTI_SESSION_TUTORIAL.md) 或 [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md)

### 第3步：开始使用

```bash
npm run dev
# 在 Bot 中发送 /session 添加账号
# 发送 /transfer 开始搬运
```

---

**祝使用愉快！** 🚀

如有问题，请查阅相关文档或提交 Issue。
