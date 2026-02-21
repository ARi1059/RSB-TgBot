#!/bin/bash

# 多 Session 功能部署脚本
# 用途：自动化部署多 Session 功能

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  多 Session 功能部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 未安装${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $1 已安装${NC}"
        return 0
    fi
}

# 步骤 1: 环境检查
echo "步骤 1/6: 环境检查"
echo "-------------------"

check_command node || exit 1
check_command npm || exit 1
check_command psql || echo -e "${YELLOW}⚠ psql 未安装，跳过数据库直接检查${NC}"

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}✗ Node.js 版本过低，需要 16+${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
fi

echo ""

# 步骤 2: 检查环境变量
echo "步骤 2/6: 检查环境变量"
echo "-------------------"

if [ ! -f .env ]; then
    echo -e "${RED}✗ .env 文件不存在${NC}"
    exit 1
fi

if grep -q "DATABASE_URL=" .env; then
    echo -e "${GREEN}✓ DATABASE_URL 已配置${NC}"
else
    echo -e "${RED}✗ DATABASE_URL 未配置${NC}"
    exit 1
fi

# 检查是否使用多 Session 模式
if grep -q "^USERBOT_API_ID=" .env && grep -q "^USERBOT_API_HASH=" .env; then
    echo -e "${YELLOW}⚠ 检测到单 Session 配置（环境变量模式）${NC}"
    echo "   如需使用多 Session 功能，请注释掉以下配置："
    echo "   - USERBOT_API_ID"
    echo "   - USERBOT_API_HASH"
    echo "   - USERBOT_SESSION"
    read -p "是否继续部署？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ 多 Session 模式已启用${NC}"
fi

echo ""

# 步骤 3: 备份数据库
echo "步骤 3/6: 备份数据库"
echo "-------------------"

read -p "是否备份数据库？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

    # 从 .env 读取 DATABASE_URL
    DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

    if command -v pg_dump &> /dev/null; then
        echo "正在备份数据库到 $BACKUP_FILE ..."
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || {
            echo -e "${YELLOW}⚠ 数据库备份失败，继续部署${NC}"
        }
        if [ -f "$BACKUP_FILE" ]; then
            echo -e "${GREEN}✓ 数据库已备份到 $BACKUP_FILE${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ pg_dump 未安装，跳过备份${NC}"
    fi
else
    echo "跳过数据库备份"
fi

echo ""

# 步骤 4: 安装依赖
echo "步骤 4/6: 安装依赖"
echo "-------------------"

echo "正在安装 npm 依赖..."
npm install

echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤 5: 数据库迁移
echo "步骤 5/6: 数据库迁移"
echo "-------------------"

echo "正在运行数据库迁移..."

# 检查迁移是否已存在
if npx prisma migrate status 2>&1 | grep -q "add_session_pool"; then
    echo -e "${YELLOW}⚠ 迁移 add_session_pool 已存在${NC}"
    read -p "是否重新运行迁移？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx prisma migrate deploy
    fi
else
    npx prisma migrate dev --name add_session_pool
fi

echo "正在生成 Prisma Client..."
npx prisma generate

echo -e "${GREEN}✓ 数据库迁移完成${NC}"
echo ""

# 步骤 6: 构建项目
echo "步骤 6/6: 构建项目"
echo "-------------------"

echo "正在构建项目..."
npm run build

echo -e "${GREEN}✓ 项目构建完成${NC}"
echo ""

# 部署完成
echo "=========================================="
echo -e "${GREEN}✓ 部署完成！${NC}"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 重启应用："
echo "   npm start"
echo "   或"
echo "   pm2 restart bot"
echo ""
echo "2. 验证部署："
echo "   - 检查应用是否正常启动"
echo "   - 发送 /session 命令测试"
echo ""
echo "3. 添加 Session 账号："
echo "   - 在 Telegram 中发送 /session"
echo "   - 点击 [➕ 添加新账号]"
echo "   - 按提示完成登录"
echo ""
echo "4. 查看文档："
echo "   - QUICK_START.md - 快速开始"
echo "   - MULTI_SESSION_GUIDE.md - 详细指南"
echo "   - MULTI_SESSION_BEST_PRACTICES.md - 最佳实践"
echo ""
echo "=========================================="
