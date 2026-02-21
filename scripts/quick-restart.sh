#!/bin/bash
# 快速重启脚本
# 用法: ./scripts/quick-restart.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 快速重启 RSB-TgBot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 步骤 1: 构建
echo "1️⃣ 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi
echo "✅ 构建完成"
echo ""

# 步骤 2: 重启 PM2
echo "2️⃣ 重启应用..."
pm2 restart rsb-bot
if [ $? -ne 0 ]; then
    echo "❌ 重启失败，请检查 PM2 状态"
    exit 1
fi
echo "✅ 应用已重启"
echo ""

# 步骤 3: 等待启动
echo "3️⃣ 等待应用启动..."
sleep 3
echo ""

# 步骤 4: 检查状态
echo "4️⃣ 检查应用状态..."
pm2 status rsb-bot
echo ""

# 步骤 5: 显示最近日志
echo "5️⃣ 最近的日志 (最近 20 行):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 logs rsb-bot --nostream --lines 20
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ 重启完成！"
echo ""
echo "💡 提示:"
echo "  • 实时查看日志: pm2 logs rsb-bot"
echo "  • 停止应用: pm2 stop rsb-bot"
echo "  • 查看状态: pm2 status"
echo ""
