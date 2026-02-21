#!/bin/bash
# 搬运任务监控脚本
# 用法: ./scripts/monitor-transfer.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 搬运任务监控面板"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 PM2 状态
echo "1️⃣ 应用状态:"
pm2 status rsb-bot 2>/dev/null | grep -E "rsb-bot|online|stopped" || echo "  ⚠️  PM2 未运行或 rsb-bot 未启动"
echo ""

# 检查最近的日志
echo "2️⃣ 最近的转发记录 (最近 10 条):"
pm2 logs rsb-bot --nostream --lines 1000 2>/dev/null | grep "Forwarded message" | tail -10 | sed 's/^/  /'
echo ""

# 检查 FloodWait 错误
echo "3️⃣ FloodWait 错误统计:"
FLOOD_COUNT=$(pm2 logs rsb-bot --nostream --lines 5000 2>/dev/null | grep -i "floodwait" | wc -l)
if [ "$FLOOD_COUNT" -eq 0 ]; then
    echo "  ✅ 未检测到 FloodWait 错误"
else
    echo "  ⚠️  检测到 $FLOOD_COUNT 次 FloodWait 错误"
    echo ""
    echo "  最近的 FloodWait 错误:"
    pm2 logs rsb-bot --nostream --lines 5000 2>/dev/null | grep -i "floodwait" | tail -3 | sed 's/^/    /'
fi
echo ""

# 检查其他错误
echo "4️⃣ 其他错误统计 (最近 5 条):"
ERROR_COUNT=$(pm2 logs rsb-bot --err --nostream --lines 1000 2>/dev/null | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "  ✅ 未检测到其他错误"
else
    echo "  ⚠️  检测到 $ERROR_COUNT 条错误日志"
    echo ""
    echo "  最近的错误:"
    pm2 logs rsb-bot --err --nostream --lines 1000 2>/dev/null | tail -5 | sed 's/^/    /'
fi
echo ""

# 数据库任务状态（需要配置数据库连接）
echo "5️⃣ 数据库任务状态:"
echo "  💡 请手动查询数据库获取详细任务状态"
echo "  SQL: SELECT id, status, total_transferred, total_scanned FROM transfer_tasks ORDER BY created_at DESC LIMIT 5;"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 提示:"
echo "  • 实时监控: pm2 logs rsb-bot"
echo "  • 只看错误: pm2 logs rsb-bot --err"
echo "  • 搜索关键字: pm2 logs rsb-bot | grep 'keyword'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
