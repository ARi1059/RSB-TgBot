#!/bin/bash

# 多 Session 功能验证脚本
# 用途：验证多 Session 功能是否正确部署

set -e

echo "=========================================="
echo "  多 Session 功能验证脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# 测试函数
test_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. 检查环境变量
echo "测试 1: 检查环境变量"
echo "-------------------"

if [ -f .env ]; then
    test_pass ".env 文件存在"
else
    test_fail ".env 文件不存在"
fi

if grep -q "DATABASE_URL=" .env 2>/dev/null; then
    test_pass "DATABASE_URL 已配置"
else
    test_fail "DATABASE_URL 未配置"
fi

if grep -q "BOT_TOKEN=" .env 2>/dev/null; then
    test_pass "BOT_TOKEN 已配置"
else
    test_fail "BOT_TOKEN 未配置"
fi

echo ""

# 2. 检查数据库连接
echo "测试 2: 检查数据库连接"
echo "-------------------"

if command -v psql &> /dev/null; then
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        test_pass "数据库连接成功"
    else
        test_fail "数据库连接失败"
    fi
else
    test_warn "psql 未安装，跳过数据库连接测试"
fi

echo ""

# 3. 检查数据库表
echo "测试 3: 检查数据库表"
echo "-------------------"

if command -v psql &> /dev/null; then
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    # 检查 userbot_sessions 表
    if psql "$DATABASE_URL" -c "\d userbot_sessions" &> /dev/null; then
        test_pass "userbot_sessions 表已创建"
    else
        test_fail "userbot_sessions 表不存在"
    fi

    # 检查 transfer_tasks 表的 current_session_id 字段
    if psql "$DATABASE_URL" -c "\d transfer_tasks" 2>/dev/null | grep -q "current_session_id"; then
        test_pass "transfer_tasks.current_session_id 字段已添加"
    else
        test_fail "transfer_tasks.current_session_id 字段不存在"
    fi

    # 检查索引
    if psql "$DATABASE_URL" -c "\d userbot_sessions" 2>/dev/null | grep -q "userbot_sessions_is_active_is_available_idx"; then
        test_pass "索引已创建"
    else
        test_warn "部分索引可能缺失"
    fi
else
    test_warn "psql 未安装，跳过数据库表检查"
fi

echo ""

# 4. 检查文件结构
echo "测试 4: 检查文件结构"
echo "-------------------"

files=(
    "src/services/sessionPool.ts"
    "src/bot/conversations/sessionManageFlow.ts"
    "MULTI_SESSION_GUIDE.md"
    "MULTI_SESSION_BEST_PRACTICES.md"
    "QUICK_START.md"
    "DATABASE_MIGRATION.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        test_pass "$file 存在"
    else
        test_fail "$file 不存在"
    fi
done

echo ""

# 5. 检查代码修改
echo "测试 5: 检查代码修改"
echo "-------------------"

# 检查 client.ts 是否包含新函数
if grep -q "getAvailableSessionClient" src/userbot/client.ts 2>/dev/null; then
    test_pass "client.ts 已更新（包含 getAvailableSessionClient）"
else
    test_fail "client.ts 未正确更新"
fi

# 检查 transfer.ts 是否包含切换逻辑
if grep -q "markSessionFloodWait" src/userbot/transfer.ts 2>/dev/null; then
    test_pass "transfer.ts 已更新（包含限流处理）"
else
    test_fail "transfer.ts 未正确更新"
fi

# 检查 admin.ts 是否包含 /session 命令
if grep -q "session.*adminOnly" src/bot/commands/admin.ts 2>/dev/null; then
    test_pass "admin.ts 已更新（包含 /session 命令）"
else
    test_fail "admin.ts 未正确更新"
fi

# 检查 bot.ts 是否注册了 sessionManageFlow
if grep -q "sessionManageFlow" src/bot/setup/bot.ts 2>/dev/null; then
    test_pass "bot.ts 已更新（注册 sessionManageFlow）"
else
    test_fail "bot.ts 未正确更新"
fi

echo ""

# 6. 检查 Prisma 配置
echo "测试 6: 检查 Prisma 配置"
echo "-------------------"

if grep -q "model UserBotSession" prisma/schema.prisma 2>/dev/null; then
    test_pass "schema.prisma 包含 UserBotSession 模型"
else
    test_fail "schema.prisma 缺少 UserBotSession 模型"
fi

if grep -q "currentSessionId" prisma/schema.prisma 2>/dev/null; then
    test_pass "schema.prisma 包含 currentSessionId 字段"
else
    test_fail "schema.prisma 缺少 currentSessionId 字段"
fi

# 检查 Prisma Client 是否已生成
if [ -d "node_modules/.prisma/client" ]; then
    test_pass "Prisma Client 已生成"
else
    test_fail "Prisma Client 未生成"
fi

echo ""

# 7. 检查构建产物
echo "测试 7: 检查构建产物"
echo "-------------------"

if [ -d "dist" ]; then
    test_pass "dist 目录存在"

    if [ -f "dist/services/sessionPool.js" ]; then
        test_pass "sessionPool.js 已编译"
    else
        test_fail "sessionPool.js 未编译"
    fi

    if [ -f "dist/bot/conversations/sessionManageFlow.js" ]; then
        test_pass "sessionManageFlow.js 已编译"
    else
        test_fail "sessionManageFlow.js 未编译"
    fi
else
    test_warn "dist 目录不存在，可能未构建"
fi

echo ""

# 8. 检查依赖
echo "测试 8: 检查依赖"
echo "-------------------"

if [ -d "node_modules" ]; then
    test_pass "node_modules 存在"

    # 检查关键依赖
    if [ -d "node_modules/@prisma/client" ]; then
        test_pass "@prisma/client 已安装"
    else
        test_fail "@prisma/client 未安装"
    fi

    if [ -d "node_modules/telegram" ]; then
        test_pass "telegram (GramJS) 已安装"
    else
        test_fail "telegram (GramJS) 未安装"
    fi

    if [ -d "node_modules/grammy" ]; then
        test_pass "grammy 已安装"
    else
        test_fail "grammy 未安装"
    fi
else
    test_fail "node_modules 不存在"
fi

echo ""

# 9. 检查进程状态（如果使用 PM2）
echo "测试 9: 检查进程状态"
echo "-------------------"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "bot"; then
        test_pass "PM2 进程存在"

        if pm2 list | grep "bot" | grep -q "online"; then
            test_pass "Bot 进程运行中"
        else
            test_warn "Bot 进程未运行"
        fi
    else
        test_warn "未找到 PM2 进程"
    fi
else
    test_warn "PM2 未安装，跳过进程检查"
fi

echo ""

# 10. 检查日志
echo "测试 10: 检查日志"
echo "-------------------"

if [ -d "logs" ]; then
    test_pass "logs 目录存在"

    if [ -f "logs/app.log" ]; then
        test_pass "app.log 存在"

        # 检查是否有错误
        if tail -n 100 logs/app.log | grep -qi "error.*session"; then
            test_warn "日志中发现 session 相关错误"
        else
            test_pass "日志中无明显错误"
        fi
    else
        test_warn "app.log 不存在"
    fi
else
    test_warn "logs 目录不存在"
fi

echo ""

# 总结
echo "=========================================="
echo "  验证结果总结"
echo "=========================================="
echo ""
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo ""
    echo "下一步："
    echo "1. 启动/重启应用"
    echo "2. 在 Telegram 中测试 /session 命令"
    echo "3. 添加第一个 Session 账号"
    echo "4. 测试搬运功能"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败，请检查上述错误${NC}"
    echo ""
    echo "常见问题："
    echo "1. 数据库迁移未运行："
    echo "   npx prisma migrate dev --name add_session_pool"
    echo ""
    echo "2. Prisma Client 未生成："
    echo "   npx prisma generate"
    echo ""
    echo "3. 项目未构建："
    echo "   npm run build"
    echo ""
    echo "4. 依赖未安装："
    echo "   npm install"
    exit 1
fi
