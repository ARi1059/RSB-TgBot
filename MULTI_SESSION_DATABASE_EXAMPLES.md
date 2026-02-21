# 多 Session 数据库配置示例

## 📊 数据库表结构

### UserBotSession 表

```sql
CREATE TABLE userbot_sessions (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  api_id            INTEGER NOT NULL,
  api_hash          VARCHAR(255) NOT NULL,
  session_string    TEXT NOT NULL,
  is_active         BOOLEAN DEFAULT true,
  is_available      BOOLEAN DEFAULT true,
  flood_wait_until  TIMESTAMP,
  last_used_at      TIMESTAMP,
  total_transferred INTEGER DEFAULT 0,
  daily_transferred INTEGER DEFAULT 0,
  last_reset_date   TIMESTAMP DEFAULT NOW(),
  priority          INTEGER DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 配置示例

### 示例 1：单 Session 配置

**场景：** 个人用户，轻度使用

**数据库记录：**

| id | name | api_id | api_hash | is_active | is_available | priority | total_transferred | daily_transferred |
|----|------|--------|----------|-----------|--------------|----------|-------------------|-------------------|
| 1 | 主账号 | 12345678 | abcdef123... | ✅ true | ✅ true | 10 | 1250 | 85 |

**SQL 插入语句：**
```sql
INSERT INTO userbot_sessions (
  name,
  api_id,
  api_hash,
  session_string,
  priority
) VALUES (
  '主账号',
  12345678,
  'abcdef1234567890abcdef1234567890',
  '1BQANOTEuMTA4LjU2LjExMwG7QvgQjqoRHUNdfdDIpYRHl40ulWIpUjwTeDMzv5m87XAGgLqrbpgk3291MDLTAOM0HxMM7juXTQPwmCnzofNT+Dt5tdP/2jCtBsjgObnEzg1zIMGvvPNgQDzexv67cjIBdisRaKH8uw209Go9dI/G1WcV1zjlpuOb0q8gyOa//dTJXVAI2gHz8gAGn5sXcJSPYqt0CDpHVKna3vnOCMyoGuI0fgG6WhMq3ZSuCbNMTZeA5sPHuvQtqVL4q1/DdkQG/jP3/++CBxvDTTh1kgTp+sgbEj1VbnXnRfBmJLyxwEIlmq146Rz17SOZJ7JFCew3X7xfFUGJ+ykKcsmS6eWqmA==',
  10
);
```

**Bot 显示：**
```
📋 Session 账号列表

✅ 🟢 #1 主账号
  📊 总转发：1250 | 今日：85
  🎯 优先级：10
```

---

### 示例 2：混合模式配置（3 个账号）

**场景：** 小团队，中度使用

**数据库记录：**

| id | name | api_id | api_hash | is_active | is_available | priority | total_transferred | daily_transferred | flood_wait_until |
|----|------|--------|----------|-----------|--------------|----------|-------------------|-------------------|------------------|
| 1 | 主力账号 | 12345678 | abcdef123... | ✅ true | ✅ true | 10 | 3500 | 420 | NULL |
| 2 | 备用账号1 | 23456789 | bcdef123... | ✅ true | ✅ true | 5 | 1200 | 150 | NULL |
| 3 | 备用账号2 | 34567890 | cdef123... | ✅ true | ✅ true | 3 | 800 | 95 | NULL |

**SQL 插入语句：**
```sql
-- 主力账号
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('主力账号', 12345678, 'abcdef1234567890abcdef1234567890', '1BQAN...', 10);

-- 备用账号1
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('备用账号1', 23456789, 'bcdef1234567890abcdef12345678901', '1BQAN...', 5);

-- 备用账号2
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('备用账号2', 34567890, 'cdef1234567890abcdef123456789012', '1BQAN...', 3);
```

**Bot 显示：**
```
📋 Session 账号列表

✅ 🟢 #1 主力账号
  📊 总转发：3500 | 今日：420
  🎯 优先级：10

✅ 🟢 #2 备用账号1
  📊 总转发：1200 | 今日：150
  🎯 优先级：5

✅ 🟢 #3 备用账号2
  📊 总转发：800 | 今日：95
  🎯 优先级：3
```

---

### 示例 3：多 Session 配置（5 个账号）

**场景：** 商业用户，重度使用

**数据库记录：**

| id | name | api_id | api_hash | is_active | is_available | priority | total_transferred | daily_transferred | flood_wait_until |
|----|------|--------|----------|-----------|--------------|----------|-------------------|-------------------|------------------|
| 1 | 主力账号1 | 12345678 | abcdef123... | ✅ true | ✅ true | 10 | 8500 | 1200 | NULL |
| 2 | 主力账号2 | 23456789 | bcdef123... | ✅ true | ✅ true | 9 | 7800 | 1050 | NULL |
| 3 | 备用账号1 | 34567890 | cdef123... | ✅ true | ✅ true | 5 | 4200 | 580 | NULL |
| 4 | 备用账号2 | 45678901 | def123... | ✅ true | ✅ true | 3 | 3100 | 420 | NULL |
| 5 | 应急账号 | 56789012 | ef123... | ✅ true | ✅ true | 1 | 1500 | 180 | NULL |

**SQL 插入语句：**
```sql
-- 主力账号1
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('主力账号1', 12345678, 'abcdef1234567890abcdef1234567890', '1BQAN...', 10);

-- 主力账号2
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('主力账号2', 23456789, 'bcdef1234567890abcdef12345678901', '1BQAN...', 9);

-- 备用账号1
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('备用账号1', 34567890, 'cdef1234567890abcdef123456789012', '1BQAN...', 5);

-- 备用账号2
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('备用账号2', 45678901, 'def1234567890abcdef1234567890123', '1BQAN...', 3);

-- 应急账号
INSERT INTO userbot_sessions (name, api_id, api_hash, session_string, priority)
VALUES ('应急账号', 56789012, 'ef1234567890abcdef12345678901234', '1BQAN...', 1);
```

**Bot 显示：**
```
📋 Session 账号列表

✅ 🟢 #1 主力账号1
  📊 总转发：8500 | 今日：1200
  🎯 优先级：10

✅ 🟢 #2 主力账号2
  📊 总转发：7800 | 今日：1050
  🎯 优先级：9

✅ 🟢 #3 备用账号1
  📊 总转发：4200 | 今日：580
  🎯 优先级：5

✅ 🟢 #4 备用账号2
  📊 总转发：3100 | 今日：420
  🎯 优先级：3

✅ 🟢 #5 应急账号
  📊 总转发：1500 | 今日：180
  🎯 优先级：1
```

---

## 🔄 限流状态示例

### 示例 4：部分账号限流

**场景：** 主力账号被限流，自动切换到备用账号

**数据库记录：**

| id | name | api_id | is_active | is_available | priority | flood_wait_until | last_used_at |
|----|------|--------|-----------|--------------|----------|------------------|--------------|
| 1 | 主力账号1 | 12345678 | ✅ true | 🔴 false | 10 | 2026-02-21 20:15:00 | 2026-02-21 19:45:00 |
| 2 | 主力账号2 | 23456789 | ✅ true | ✅ true | 9 | NULL | 2026-02-21 19:50:00 |
| 3 | 备用账号1 | 34567890 | ✅ true | ✅ true | 5 | NULL | 2026-02-21 18:30:00 |
| 4 | 备用账号2 | 45678901 | ✅ true | ✅ true | 3 | NULL | 2026-02-21 17:20:00 |
| 5 | 应急账号 | 56789012 | ✅ true | ✅ true | 1 | NULL | 2026-02-21 16:00:00 |

**Bot 显示：**
```
📋 Session 账号列表

✅ 🔴 #1 主力账号1
  📊 总转发：8500 | 今日：1200
  🎯 优先级：10
  ⏳ 限流至：2026-02-21 20:15:00

✅ 🟢 #2 主力账号2
  📊 总转发：7800 | 今日：1050
  🎯 优先级：9

✅ 🟢 #3 备用账号1
  📊 总转发：4200 | 今日：580
  🎯 优先级：5

✅ 🟢 #4 备用账号2
  📊 总转发：3100 | 今日：420
  🎯 优先级：3

✅ 🟢 #5 应急账号
  📊 总转发：1500 | 今日：180
  🎯 优先级：1
```

**系统行为：**
```
1. 主力账号1 被限流（flood_wait_until 有值）
2. 系统自动选择主力账号2（优先级 9，可用）
3. 继续搬运任务
4. 2026-02-21 20:15:00 后，主力账号1 自动恢复可用
```

---

### 示例 5：所有账号限流

**场景：** 速率过快，所有账号都被限流

**数据库记录：**

| id | name | is_active | is_available | priority | flood_wait_until |
|----|------|-----------|--------------|----------|------------------|
| 1 | 主力账号1 | ✅ true | 🔴 false | 10 | 2026-02-21 20:15:00 |
| 2 | 主力账号2 | ✅ true | 🔴 false | 9 | 2026-02-21 20:20:00 |
| 3 | 备用账号1 | ✅ true | 🔴 false | 5 | 2026-02-21 20:10:00 |
| 4 | 备用账号2 | ✅ true | 🔴 false | 3 | 2026-02-21 20:25:00 |
| 5 | 应急账号 | ✅ true | 🔴 false | 1 | 2026-02-21 20:30:00 |

**Bot 显示：**
```
⚠️ 所有账号均被限流，已暂停

📦 批次：1
✅ 已扫描：1500 条消息
📥 已转发：850 个文件
⏳ 最短等待：600 秒 (约 10 分钟)

💡 任务已保存，请稍后继续或添加新的 session 账号
```

**系统行为：**
```
1. 所有账号都被限流
2. 任务自动暂停
3. 保存当前进度
4. 等待最早解除限流的账号（备用账号1，20:10:00）
5. 用户可以手动继续任务，或等待自动恢复
```

---

## 🎛️ 账号状态管理

### 启用/禁用账号

**禁用账号 2：**
```sql
UPDATE userbot_sessions
SET is_active = false, updated_at = NOW()
WHERE id = 2;
```

**结果：**
| id | name | is_active | is_available | priority |
|----|------|-----------|--------------|----------|
| 1 | 主力账号1 | ✅ true | ✅ true | 10 |
| 2 | 主力账号2 | ❌ false | ✅ true | 9 |
| 3 | 备用账号1 | ✅ true | ✅ true | 5 |

**Bot 显示：**
```
✅ 🟢 #1 主力账号1
❌ 🟢 #2 主力账号2 (已禁用)
✅ 🟢 #3 备用账号1
```

**系统行为：**
- 账号 2 不会被自动选择使用
- 可以随时重新启用

---

### 重置限流状态

**手动重置账号 1 的限流：**
```sql
UPDATE userbot_sessions
SET
  is_available = true,
  flood_wait_until = NULL,
  updated_at = NOW()
WHERE id = 1;
```

**结果：**
| id | name | is_available | flood_wait_until |
|----|------|--------------|------------------|
| 1 | 主力账号1 | ✅ true | NULL |

**Bot 显示：**
```
✅ 限流状态已重置
```

---

### 删除账号

**删除账号 5：**
```sql
DELETE FROM userbot_sessions WHERE id = 5;
```

**结果：**
```
账号 "应急账号" 已被永久删除
```

---

## 📈 统计查询

### 查询所有账号统计

```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE is_available = true) as available,
  COUNT(*) FILTER (WHERE flood_wait_until IS NOT NULL AND flood_wait_until > NOW()) as flood_waiting,
  SUM(total_transferred) as total_transferred,
  SUM(daily_transferred) as daily_transferred
FROM userbot_sessions;
```

**结果：**
| total | active | available | flood_waiting | total_transferred | daily_transferred |
|-------|--------|-----------|---------------|-------------------|-------------------|
| 5 | 5 | 4 | 1 | 25100 | 3430 |

**Bot 显示：**
```
📊 Session 账号统计

📈 总体统计：
• 总账号数：5
• 已启用：5
• 可用：4
• 限流中：1

📦 转发统计：
• 总转发数：25100
• 今日转发：3430
• 平均每账号：5020
```

---

### 查询可用账号（按优先级排序）

```sql
SELECT id, name, priority, total_transferred, daily_transferred
FROM userbot_sessions
WHERE is_active = true
  AND is_available = true
  AND (flood_wait_until IS NULL OR flood_wait_until < NOW())
ORDER BY priority DESC, daily_transferred ASC
LIMIT 1;
```

**结果：**
| id | name | priority | total_transferred | daily_transferred |
|----|------|----------|-------------------|-------------------|
| 2 | 主力账号2 | 9 | 7800 | 1050 |

**说明：**
- 选择优先级最高的可用账号
- 相同优先级时，选择今日转发数最少的
- 这是系统自动选择账号的逻辑

---

### 查询限流账号

```sql
SELECT id, name, flood_wait_until,
       EXTRACT(EPOCH FROM (flood_wait_until - NOW())) as seconds_remaining
FROM userbot_sessions
WHERE flood_wait_until IS NOT NULL
  AND flood_wait_until > NOW()
ORDER BY flood_wait_until ASC;
```

**结果：**
| id | name | flood_wait_until | seconds_remaining |
|----|------|------------------|-------------------|
| 1 | 主力账号1 | 2026-02-21 20:15:00 | 1800 |

**Bot 显示：**
```
🔴 限流账号：

#1 主力账号1
  ⏳ 剩余时间：30 分钟
  🕐 解除时间：2026-02-21 20:15:00
```

---

## 🔧 维护操作

### 每日重置统计

```sql
-- 重置所有账号的今日转发数
UPDATE userbot_sessions
SET
  daily_transferred = 0,
  last_reset_date = NOW(),
  updated_at = NOW()
WHERE DATE(last_reset_date) < CURRENT_DATE;
```

**说明：**
- 每天自动执行（可以用 cron job）
- 重置 daily_transferred 为 0
- 更新 last_reset_date

---

### 清理过期限流状态

```sql
-- 自动清理已过期的限流状态
UPDATE userbot_sessions
SET
  is_available = true,
  flood_wait_until = NULL,
  updated_at = NOW()
WHERE flood_wait_until IS NOT NULL
  AND flood_wait_until < NOW();
```

**说明：**
- 定期执行（每分钟）
- 自动恢复已解除限流的账号

---

### 备份账号数据

```sql
-- 导出所有账号配置（不含敏感信息）
SELECT
  id,
  name,
  api_id,
  is_active,
  is_available,
  priority,
  total_transferred,
  daily_transferred,
  created_at
FROM userbot_sessions
ORDER BY priority DESC;
```

**说明：**
- 定期备份账号配置
- 不包含 api_hash 和 session_string（敏感信息）
- 用于恢复或迁移

---

## 📊 可视化示例

### 账号使用分布图

```
主力账号1 ████████████████████ 8500 (34%)
主力账号2 ███████████████████  7800 (31%)
备用账号1 ██████████           4200 (17%)
备用账号2 ███████              3100 (12%)
应急账号   ███                  1500 (6%)
```

### 优先级分布

```
Priority 10: ████████████████████ 1 账号
Priority 9:  ████████████████████ 1 账号
Priority 5:  ████████████████████ 1 账号
Priority 3:  ████████████████████ 1 账号
Priority 1:  ████████████████████ 1 账号
```

### 今日转发趋势

```
主力账号1: ████████████ 1200 (35%)
主力账号2: ███████████  1050 (31%)
备用账号1: ██████       580 (17%)
备用账号2: ████         420 (12%)
应急账号:  ██           180 (5%)
```

---

## 🔍 监控查询

### 实时监控查询

```sql
-- 查看当前正在使用的账号
SELECT s.id, s.name, s.priority, t.status, t.current_session_id
FROM userbot_sessions s
LEFT JOIN transfer_tasks t ON s.id = t.current_session_id
WHERE t.status = 'running'
ORDER BY t.updated_at DESC;
```

### 限流预警查询

```sql
-- 查询今日转发数接近限制的账号
SELECT id, name, daily_transferred, priority
FROM userbot_sessions
WHERE daily_transferred > 1000  -- 预警阈值
  AND is_active = true
ORDER BY daily_transferred DESC;
```

### 账号健康度查询

```sql
-- 评估账号健康度
SELECT
  id,
  name,
  CASE
    WHEN is_active = false THEN '已禁用'
    WHEN flood_wait_until > NOW() THEN '限流中'
    WHEN daily_transferred > 1500 THEN '高负载'
    WHEN daily_transferred > 1000 THEN '中负载'
    ELSE '正常'
  END as health_status,
  daily_transferred,
  total_transferred
FROM userbot_sessions
ORDER BY
  CASE
    WHEN is_active = false THEN 4
    WHEN flood_wait_until > NOW() THEN 3
    WHEN daily_transferred > 1500 THEN 2
    WHEN daily_transferred > 1000 THEN 1
    ELSE 0
  END DESC;
```

---

## 📝 最佳实践

### 1. 定期检查账号状态

```sql
-- 每小时执行
SELECT
  COUNT(*) FILTER (WHERE is_available = true) as available_count,
  COUNT(*) FILTER (WHERE flood_wait_until > NOW()) as flood_count
FROM userbot_sessions
WHERE is_active = true;
```

### 2. 负载均衡

```sql
-- 查找使用最少的账号
SELECT id, name, daily_transferred
FROM userbot_sessions
WHERE is_active = true AND is_available = true
ORDER BY priority DESC, daily_transferred ASC
LIMIT 1;
```

### 3. 自动恢复

```sql
-- 定时任务：每分钟执行
UPDATE userbot_sessions
SET is_available = true, flood_wait_until = NULL
WHERE flood_wait_until IS NOT NULL AND flood_wait_until < NOW();
```

---

## 🎯 总结

通过数据库管理多个 Session，你可以：

1. **灵活配置** - 动态添加、删除、启用/禁用账号
2. **自动切换** - 系统自动选择最佳账号
3. **负载均衡** - 均匀分配任务到各个账号
4. **实时监控** - 查看账号状态和使用情况
5. **故障恢复** - 自动处理限流和异常

**相关文档：**
- [MULTI_SESSION_QUICK_CONFIG.md](MULTI_SESSION_QUICK_CONFIG.md) - 快速配置指南
- [.env.multi-session.example](.env.multi-session.example) - 详细配置示例
- [MULTI_SESSION_GUIDE.md](MULTI_SESSION_GUIDE.md) - 功能详细指南

---

**祝使用愉快！** 🚀
