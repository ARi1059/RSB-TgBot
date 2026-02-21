#!/bin/bash
# 数据库任务查询脚本
# 用法: ./scripts/check-tasks.sh [数据库连接字符串]
# 示例: ./scripts/check-tasks.sh "postgresql://user:pass@localhost:5432/dbname"

DB_URL="${1:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo "❌ 错误: 请提供数据库连接字符串"
    echo "用法: $0 <database_url>"
    echo "或设置环境变量: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 搬运任务数据库查询"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 查询最近的任务
echo "1️⃣ 最近的 5 个任务:"
psql "$DB_URL" -c "
SELECT
    id,
    status,
    total_transferred,
    total_scanned,
    batch_number,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created,
    TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated
FROM transfer_tasks
ORDER BY created_at DESC
LIMIT 5;
" 2>/dev/null || echo "  ⚠️  数据库查询失败"
echo ""

# 查询暂停的任务
echo "2️⃣ 暂停的任务:"
PAUSED_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM transfer_tasks WHERE status = 'paused';" 2>/dev/null | tr -d ' ')
if [ "$PAUSED_COUNT" = "0" ]; then
    echo "  ✅ 没有暂停的任务"
else
    echo "  ⚠️  有 $PAUSED_COUNT 个暂停的任务"
    psql "$DB_URL" -c "
    SELECT
        id,
        total_transferred,
        total_scanned,
        last_message_id,
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as paused_at
    FROM transfer_tasks
    WHERE status = 'paused'
    ORDER BY updated_at DESC;
    " 2>/dev/null
fi
echo ""

# 查询失败的任务
echo "3️⃣ 失败的任务:"
FAILED_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM transfer_tasks WHERE status = 'failed';" 2>/dev/null | tr -d ' ')
if [ "$FAILED_COUNT" = "0" ]; then
    echo "  ✅ 没有失败的任务"
else
    echo "  ⚠️  有 $FAILED_COUNT 个失败的任务"
    psql "$DB_URL" -c "
    SELECT
        id,
        error_message,
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as failed_at
    FROM transfer_tasks
    WHERE status = 'failed'
    ORDER BY updated_at DESC
    LIMIT 5;
    " 2>/dev/null
fi
echo ""

# 统计信息
echo "4️⃣ 任务统计:"
psql "$DB_URL" -c "
SELECT
    status,
    COUNT(*) as count,
    SUM(total_transferred) as total_files
FROM transfer_tasks
GROUP BY status
ORDER BY count DESC;
" 2>/dev/null || echo "  ⚠️  统计查询失败"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 提示:"
echo "  • 继续暂停的任务: 使用相同配置重新发起搬运"
echo "  • 清理旧任务: npm run prisma studio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
