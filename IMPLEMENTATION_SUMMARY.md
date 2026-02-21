# 多 Session 功能实现总结

## 实现概述

本次更新为 RSB Telegram Bot 添加了完整的多 Session 账号池管理功能，支持使用多个 Telegram UserBot 账号进行大批量搬运工作，具备自动切换、断点续传、智能调度等特性。

## 核心功能

### 1. Session 账号池管理

**数据库层：**
- 新增 `userbot_sessions` 表存储账号信息
- 支持账号的启用/禁用、优先级设置
- 记录限流状态和解除时间
- 统计转发数据（总计/每日）

**服务层：**
- `src/services/sessionPool.ts` - 完整的 Session 池管理服务
- 支持添加、删除、更新、查询账号
- 自动选择最佳可用账号
- 限流状态管理和自动恢复

### 2. 自动切换机制

**实现逻辑：**
- 搬运过程中检测 FloodWait 错误
- 标记当前账号为限流状态，记录解除时间
- 自动获取下一个可用账号
- 无缝切换，从中断处继续搬运

**关键代码位置：**
- `src/userbot/transfer.ts:298-360` - 限流检测和切换逻辑

### 3. 断点续传

**实现方式：**
- `transfer_tasks` 表新增 `current_session_id` 字段
- 记录最后处理的消息 ID
- 任务暂停时保存完整状态
- 恢复时优先使用之前的 session，失败则切换

### 4. Bot 内管理界面

**会话流程：**
- `src/bot/conversations/sessionManageFlow.ts` - 完整的管理界面
- 支持添加账号（含登录流程）
- 查看账号列表和状态
- 启用/禁用、删除账号
- 重置限流状态
- 查看统计信息

**命令注册：**
- `/session` 命令进入管理界面
- 集成到主 Bot 流程中

### 5. 智能调度

**选择策略：**
1. 只选择 `isActive=true` 且 `isAvailable=true` 的账号
2. 自动重置已过期的限流状态
3. 按优先级降序排序
4. 相同优先级按最后使用时间升序（轮流使用）

**代码位置：**
- `src/services/sessionPool.ts:52-90` - `getAvailableSession()`

## 文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `src/services/sessionPool.ts` | Session 池管理服务 |
| `src/bot/conversations/sessionManageFlow.ts` | Session 管理界面 |
| `MULTI_SESSION_GUIDE.md` | 功能详细说明文档 |
| `MULTI_SESSION_BEST_PRACTICES.md` | 最佳实践和使用示例 |
| `QUICK_START.md` | 快速开始指南 |
| `DATABASE_MIGRATION.md` | 数据库迁移说明 |
| `IMPLEMENTATION_SUMMARY.md` | 本文档 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `prisma/schema.prisma` | 新增 `UserBotSession` 表，`TransferTask` 表新增字段 |
| `src/userbot/client.ts` | 重构为支持多客户端连接池 |
| `src/userbot/transfer.ts` | 添加自动切换和断点续传逻辑 |
| `src/bot/commands/admin.ts` | 新增 `/session` 命令 |
| `src/bot/setup/bot.ts` | 注册 `sessionManageFlow` 会话 |
| `src/constants/index.ts` | 新增 `SESSION_MANAGE` 回调常量 |
| `README.md` | 添加多 Session 功能说明 |

## 数据库变更

### 新增表：userbot_sessions

```sql
CREATE TABLE "userbot_sessions" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "api_id" INTEGER NOT NULL,
    "api_hash" TEXT NOT NULL,
    "session_string" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "is_available" BOOLEAN DEFAULT true,
    "flood_wait_until" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "total_transferred" INTEGER DEFAULT 0,
    "daily_transferred" INTEGER DEFAULT 0,
    "last_reset_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);
```

### 修改表：transfer_tasks

```sql
ALTER TABLE "transfer_tasks"
ADD COLUMN "current_session_id" INTEGER;
```

## 技术架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Telegram Bot                         │
│                   (grammY Framework)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ /session 命令
                     ↓
┌─────────────────────────────────────────────────────────┐
│              sessionManageFlow                           │
│         (Session 管理会话流程)                            │
│  • 添加账号  • 查看列表  • 启用/禁用  • 删除             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              sessionPool Service                         │
│           (Session 池管理服务)                            │
│  • getAvailableSession()  • markSessionFloodWait()      │
│  • incrementSessionTransfer()  • toggleSession()        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  Database (PostgreSQL)                   │
│              userbot_sessions 表                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Transfer Flow                          │
│                  (搬运任务流程)                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Client Pool Manager                         │
│           (客户端连接池管理)                              │
│  • getAvailableSessionClient()                          │
│  • getClientBySessionId()                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Telegram UserBot Clients                    │
│         (多个 GramJS 客户端实例)                          │
│  Session 1  │  Session 2  │  Session 3  │  ...         │
└─────────────────────────────────────────────────────────┘
```

### 工作流程

```
1. 用户发起搬运任务
   ↓
2. 从 Session 池获取可用账号
   ↓
3. 创建/获取该账号的客户端连接
   ↓
4. 开始搬运，逐条转发消息
   ↓
5. 检测到 FloodWait 错误
   ↓
6. 标记当前账号为限流
   ↓
7. 尝试获取下一个可用账号
   ↓
8a. 成功 → 切换账号，继续搬运
   ↓
8b. 失败 → 暂停任务，等待/添加账号
   ↓
9. 任务完成或暂停，保存进度
```

## 关键代码片段

### 1. 获取可用 Session

```typescript
// src/services/sessionPool.ts
export async function getAvailableSession(): Promise<SessionInfo | null> {
  const now = new Date();

  // 重置已过期的限流状态
  await prisma.userBotSession.updateMany({
    where: {
      isAvailable: false,
      floodWaitUntil: { lte: now },
    },
    data: {
      isAvailable: true,
      floodWaitUntil: null,
    },
  });

  // 获取可用的 session（按优先级降序，最后使用时间升序）
  const session = await prisma.userBotSession.findFirst({
    where: {
      isActive: true,
      isAvailable: true,
      OR: [
        { floodWaitUntil: null },
        { floodWaitUntil: { lte: now } },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { lastUsedAt: 'asc' },
    ],
  });

  return session as SessionInfo | null;
}
```

### 2. 限流检测和自动切换

```typescript
// src/userbot/transfer.ts
catch (error: any) {
  const isFloodWait = /* 检测限流错误 */;

  if (isFloodWait) {
    const waitTime = error.seconds || 60;

    // 标记当前 session 为限流状态
    await sessionPool.markSessionFloodWait(sessionId, waitTime);

    // 尝试切换到另一个可用的 session
    try {
      const newSessionClient = await getAvailableSessionClient();
      sessionId = newSessionClient.sessionId;
      client = newSessionClient.client;

      // 更新任务的 session ID
      await transferService.updateTransferTask(taskId, {
        currentSessionId: sessionId
      });

      // 继续搬运
      continue;
    } catch (switchError) {
      // 没有可用的 session，暂停任务
      await transferService.markTaskAsPaused(taskId, stats.lastMessageId);
      return;
    }
  }
}
```

### 3. Session 登录流程

```typescript
// src/bot/conversations/sessionManageFlow.ts
async function addSessionFlow(conversation: MyConversation, ctx: MyContext) {
  // 1. 收集账号信息
  const name = await askForName();
  const apiId = await askForApiId();
  const apiHash = await askForApiHash();
  const priority = await askForPriority();

  // 2. 创建新客户端
  const client = await createNewSession(apiId, apiHash);

  // 3. 发送验证码
  const phone = await askForPhone();
  await client.sendCode({ apiId, apiHash }, phone);

  // 4. 登录
  const code = await askForCode();
  await client.signIn({ apiId, apiHash }, {
    phoneNumber: async () => phone,
    phoneCode: async () => code,
    password: async () => await askForPassword(),
  });

  // 5. 保存 session
  const sessionString = client.session.save() as string;
  await sessionPool.addSession({
    name, apiId, apiHash, sessionString, priority
  });

  await client.disconnect();
}
```

## 向后兼容性

系统完全向后兼容，支持两种模式：

### 模式 1：单 Session（环境变量）

如果 `.env` 中配置了：
```env
USERBOT_API_ID=xxx
USERBOT_API_HASH=xxx
USERBOT_SESSION=xxx
```

系统会优先使用环境变量中的 session，不会从数据库中选择。

### 模式 2：多 Session（数据库）

如果环境变量未配置或注释掉，系统会自动从数据库的 session 池中选择可用账号。

**切换方式：**
- 单 → 多：注释掉环境变量，重启 Bot
- 多 → 单：配置环境变量，重启 Bot

## 部署检查清单

### 部署前准备

- [ ] 备份当前数据库
- [ ] 确认 `.env` 配置正确
- [ ] 确认 `DATABASE_URL` 可访问
- [ ] 准备好至少 1 个 Telegram 账号的 API 凭证

### 部署步骤

1. **拉取代码**
   ```bash
   git pull origin main
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **运行数据库迁移**
   ```bash
   npx prisma migrate dev --name add_session_pool
   npx prisma generate
   ```

4. **配置环境**
   - 选项 A：继续使用单 session（保持 `.env` 不变）
   - 选项 B：使用多 session（注释掉 `USERBOT_*` 配置）

5. **重启应用**
   ```bash
   npm run build
   pm2 restart bot
   # 或
   docker-compose restart
   ```

6. **验证部署**
   - [ ] Bot 正常启动
   - [ ] 发送 `/session` 命令能正常响应
   - [ ] 数据库中 `userbot_sessions` 表已创建
   - [ ] 日志中无错误信息

### 部署后配置

1. **添加 Session 账号**
   ```
   /session → [➕ 添加新账号]
   ```

2. **测试搬运功能**
   ```
   /transfer → 配置小批量测试任务
   ```

3. **监控运行状态**
   ```bash
   # 查看日志
   tail -f logs/app.log

   # 查看 Session 状态
   /session → [📋 查看账号列表]
   ```

### 回滚方案

如果部署出现问题：

1. **停止应用**
   ```bash
   pm2 stop bot
   ```

2. **回滚数据库**
   ```bash
   # 删除新表
   psql $DATABASE_URL -c "DROP TABLE IF EXISTS userbot_sessions;"
   psql $DATABASE_URL -c "ALTER TABLE transfer_tasks DROP COLUMN IF EXISTS current_session_id;"
   ```

3. **回滚代码**
   ```bash
   git checkout <previous-commit>
   npm install
   npm run build
   ```

4. **重启应用**
   ```bash
   pm2 start bot
   ```

## 测试建议

### 单元测试

建议添加以下测试：

```typescript
// tests/sessionPool.test.ts
describe('SessionPool', () => {
  test('getAvailableSession returns highest priority session', async () => {
    // 测试优先级排序
  });

  test('markSessionFloodWait sets correct expiry time', async () => {
    // 测试限流标记
  });

  test('expired flood wait is automatically reset', async () => {
    // 测试自动恢复
  });
});
```

### 集成测试

```typescript
// tests/transfer.integration.test.ts
describe('Transfer with multiple sessions', () => {
  test('switches to next session on flood wait', async () => {
    // 测试自动切换
  });

  test('resumes from last message after pause', async () => {
    // 测试断点续传
  });
});
```

### 手动测试清单

- [ ] 添加 Session 账号（正常流程）
- [ ] 添加 Session 账号（错误验证码）
- [ ] 添加 Session 账号（需要两步验证）
- [ ] 查看 Session 列表
- [ ] 启用/禁用 Session
- [ ] 删除 Session
- [ ] 开始搬运任务（单 Session）
- [ ] 触发限流，验证自动切换
- [ ] 所有 Session 限流，验证暂停
- [ ] 添加新 Session 后继续任务
- [ ] 重置限流状态
- [ ] 查看统计信息

## 性能考虑

### 数据库查询优化

已添加的索引：
```sql
CREATE INDEX "userbot_sessions_is_active_is_available_idx"
ON "userbot_sessions"("is_active", "is_available");

CREATE INDEX "userbot_sessions_flood_wait_until_idx"
ON "userbot_sessions"("flood_wait_until");

CREATE INDEX "userbot_sessions_priority_idx"
ON "userbot_sessions"("priority");
```

### 连接池管理

- 使用 Map 缓存客户端连接
- 避免重复创建连接
- 自动清理不活跃的连接

### 内存使用

- 每个客户端连接约占用 5-10MB 内存
- 建议最多同时维护 10 个活跃连接
- 定期清理不使用的连接

## 安全考虑

### 敏感数据保护

- `session_string` 包含账号凭证，需加密存储（建议）
- 限制数据库访问权限
- 不在日志中记录完整的 session_string

### API 凭证管理

- 不在代码中硬编码 API ID/Hash
- 使用环境变量或密钥管理服务
- 定期轮换凭证

### 访问控制

- `/session` 命令仅管理员可用
- 数据库操作需要认证
- 限制 Bot API 访问频率

## 监控和告警

### 关键指标

- 可用 Session 数量
- 限流频率和时长
- 转发成功率
- 任务完成时间

### 日志关键字

```bash
# 限流告警
grep "FloodWait" logs/app.log

# 切换记录
grep "Switched from session" logs/app.log

# 错误记录
grep "ERROR.*session" logs/app.log
```

### 建议告警规则

- 可用 Session < 2 个
- 单个 Session 限流超过 6 小时
- 任务失败率 > 10%
- 数据库连接失败

## 未来改进方向

### 短期（1-2 周）

- [ ] 添加 Session 编辑功能（修改名称、优先级）
- [ ] 支持导入/导出 Session 配置
- [ ] 添加 Session 健康度评分
- [ ] 优化登录流程的错误处理

### 中期（1-2 月）

- [ ] 添加 Session 使用统计图表
- [ ] 支持按时间段自动调整优先级
- [ ] 实现 Session 负载均衡算法
- [ ] 添加 Session 性能分析

### 长期（3+ 月）

- [ ] 支持多 Bot 实例共享 Session 池
- [ ] 实现智能限流预测
- [ ] 添加 Session 自动轮换策略
- [ ] 支持 Session 分组管理

## 相关资源

### 文档

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [GramJS 文档](https://gram.js.org/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [grammY 文档](https://grammy.dev/)

### 工具

- [Telegram API ID 申请](https://my.telegram.org)
- [Prisma Studio](https://www.prisma.io/studio) - 数据库可视化
- [PM2](https://pm2.keymetrics.io/) - 进程管理

## 贡献者

本功能由 Claude (Anthropic) 协助实现。

## 更新日志

### v1.0.0 (2024-01-15)

- ✨ 新增多 Session 账号池管理
- ✨ 新增自动切换和断点续传
- ✨ 新增 Bot 内 Session 管理界面
- ✨ 新增智能调度和统计监控
- 📝 完善文档和使用指南
- 🔧 优化数据库结构和索引

---

**实现完成日期：** 2024-01-15
**版本：** v1.0.0
**状态：** ✅ 已完成，待部署测试
