#!/bin/bash

# 多 Session 功能回滚脚本
# 用途：回滚到部署前的状态

set -e

echo "=========================================="
echo "  多 Session 功能回滚脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 警告
echo -e "${RED}⚠️  警告：此操作将回滚多 Session 功能！${NC}"
echo ""
echo "回滚操作包括："
echo "1. 删除 userbot_sessions 表"
echo "2. 删除 transfer_tasks.current_session_id 字段"
echo "3. 回滚代码到指定版本（可选）"
echo ""

read -p "确认要继续吗？(yes/no) " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    echo "已取消回滚"
    exit 0
fi

# 步骤 1: 停止应用
echo "步骤 1/5: 停止应用"
echo "-------------------"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "bot"; then
        echo "正在停止 PM2 进程..."
        pm2 stop bot
        echo -e "${GREEN}✓ 应用已停止${NC}"
    else
        echo "未找到 PM2 进程"
    fi
else
    echo -e "${YELLOW}⚠ PM2 未安装，请手动停止应用${NC}"
    read -p "应用已停止？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# 步骤 2: 备份当前数据（可选）
echo "步骤 2/5: 备份当前数据"
echo "-------------------"

read -p "是否备份当前 Session 数据？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_FILE="sessions_backup_$(date +%Y%m%d_%H%M%S).sql"
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    if command -v pg_dump &> /dev/null; then
        echo "正在备份 Session 数据到 $BACKUP_FILE ..."
        pg_dump "$DATABASE_URL" -t userbot_sessions > "$BACKUP_FILE" 2>/dev/null || {
            echo -e "${YELLOW}⚠ 备份失败${NC}"
        }
        if [ -f "$BACKUP_FILE" ]; then
            echo -e "${GREEN}✓ Session 数据已备份到 $BACKUP_FILE${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ pg_dump 未安装，跳过备份${NC}"
    fi
else
    echo "跳过数据备份"
fi

echo ""

# 步骤 3: 回滚数据库
echo "步骤 3/5: 回滚数据库"
echo "-------------------"

DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if command -v psql &> /dev/null; then
    echo "正在删除 userbot_sessions 表..."
    psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS userbot_sessions CASCADE;" 2>/dev/null && {
        echo -e "${GREEN}✓ userbot_sessions 表已删除${NC}"
    } || {
        echo -e "${RED}✗ 删除 userbot_sessions 表失败${NC}"
    }

    echo "正在删除 transfer_tasks.current_session_id 字段..."
    psql "$DATABASE_URL" -c "ALTER TABLE transfer_tasks DROP COLUMN IF EXISTS current_session_id;" 2>/dev/null && {
        echo -e "${GREEN}✓ current_session_id 字段已删除${NC}"
    } || {
        echo -e "${RED}✗ 删除 current_session_id 字段失败${NC}"
    }

    echo "正在删除 Prisma 迁移记录..."
    psql "$DATABASE_URL" -c "DELETE FROM _prisma_migrations WHERE migration_name = 'add_session_pool';" 2>/dev/null && {
        echo -e "${GREEN}✓ 迁移记录已删除${NC}"
    } || {
        echo -e "${YELLOW}⚠ 删除迁移记录失败或不存在${NC}"
    }
else
    echo -e "${RED}✗ psql 未安装，无法自动回滚数据库${NC}"
    echo ""
    echo "请手动执行以下 SQL："
    echo ""
    echo "DROP TABLE IF EXISTS userbot_sessions CASCADE;"
    echo "ALTER TABLE transfer_tasks DROP COLUMN IF EXISTS current_session_id;"
    echo "DELETE FROM _prisma_migrations WHERE migration_name = 'add_session_pool';"
    echo ""
    read -p "已手动执行 SQL？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# 步骤 4: 回滚代码（可选）
echo "步骤 4/5: 回滚代码"
echo "-------------------"

read -p "是否回滚代码到之前的版本？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 显示最近的提交
    echo "最近的提交："
    git log --oneline -10

    echo ""
    read -p "请输入要回滚到的 commit hash（或按 Enter 跳过）: " COMMIT_HASH

    if [ -n "$COMMIT_HASH" ]; then
        echo "正在回滚代码到 $COMMIT_HASH ..."
        git checkout "$COMMIT_HASH" || {
            echo -e "${RED}✗ 代码回滚失败${NC}"
            exit 1
        }
        echo -e "${GREEN}✓ 代码已回滚${NC}"

        echo "正在重新安装依赖..."
        npm install

        echo "正在重新构建..."
        npm run build

        echo -e "${GREEN}✓ 代码回滚完成${NC}"
    else
        echo "跳过代码回滚"
    fi
else
    echo "跳过代码回滚"
    echo ""
    echo -e "${YELLOW}⚠ 注意：如果不回滚代码，需要手动删除以下文件：${NC}"
    echo "  - src/services/sessionPool.ts"
    echo "  - src/bot/conversations/sessionManageFlow.ts"
    echo ""
    echo "并恢复以下文件的修改："
    echo "  - src/userbot/client.ts"
    echo "  - src/userbot/transfer.ts"
    echo "  - src/bot/commands/admin.ts"
    echo "  - src/bot/setup/bot.ts"
    echo "  - prisma/schema.prisma"
    echo ""
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# 步骤 5: 恢复环境变量配置（可选）
echo "步骤 5/5: 恢复环境变量配置"
echo "-------------------"

read -p "是否恢复单 Session 环境变量配置？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "请手动在 .env 中配置以下变量："
    echo ""
    echo "USERBOT_API_ID=your_api_id"
    echo "USERBOT_API_HASH=your_api_hash"
    echo "USERBOT_SESSION=your_session_string"
    echo ""
    read -p "已配置完成？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ 环境变量配置完成${NC}"
    fi
else
    echo "跳过环境变量配置"
fi

echo ""

# 回滚完成
echo "=========================================="
echo -e "${GREEN}✓ 回滚完成！${NC}"
echo "=========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 验证数据库状态："
echo "   npx prisma db pull"
echo "   npx prisma validate"
echo ""
echo "2. 重新生成 Prisma Client："
echo "   npx prisma generate"
echo ""
echo "3. 重启应用："
echo "   npm start"
echo "   或"
echo "   pm2 start bot"
echo ""
echo "4. 验证应用："
echo "   - 检查应用是否正常启动"
echo "   - 测试基本功能"
echo "   - 检查日志是否有错误"
echo ""

if [ -f "$BACKUP_FILE" ]; then
    echo "5. Session 数据备份位置："
    echo "   $BACKUP_FILE"
    echo ""
    echo "   如需恢复 Session 数据："
    echo "   psql \$DATABASE_URL < $BACKUP_FILE"
    echo ""
fi

echo "=========================================="
