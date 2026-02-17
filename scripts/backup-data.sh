#!/bin/bash

# 数据备份脚本
# 在执行 prisma migrate reset 之前运行此脚本

echo "🔄 开始备份数据..."

# 获取数据库连接信息
source .env
DB_URL=$DATABASE_URL

# 解析数据库连接字符串
# 格式: postgresql://user:password@host:port/database
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD=$DB_PASS

echo "📊 数据库: $DB_NAME"
echo "🏠 主机: $DB_HOST:$DB_PORT"
echo ""

# 1. 创建备份表（如果不存在）
echo "📋 创建备份表结构..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f prisma/backup-schema.sql

# 2. 备份合集数据
echo "💾 备份合集数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO collections_backup (original_id, token, title, description, creator_id, created_at, updated_at)
SELECT id, token, title, description, creator_id, created_at, updated_at
FROM collections
ON CONFLICT (original_id, backup_at) DO NOTHING;
EOF

# 3. 备份媒体文件数据
echo "🎬 备份媒体文件数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO media_files_backup (original_id, collection_id, file_id, unique_file_id, file_type, "order", created_at)
SELECT id, collection_id, file_id, unique_file_id, file_type, "order", created_at
FROM media_files
ON CONFLICT (original_id, backup_at) DO NOTHING;
EOF

# 4. 备份用户数据
echo "👥 备份用户数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users_backup (original_id, telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at)
SELECT id, telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at
FROM users
ON CONFLICT (original_id, backup_at) DO NOTHING;
EOF

# 5. 备份系统设置数据
echo "⚙️  备份系统设置..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO settings_backup (original_id, key, value, created_at, updated_at)
SELECT id, key, value, created_at, updated_at
FROM settings
ON CONFLICT (original_id, backup_at) DO NOTHING;
EOF

# 统计备份数据
echo ""
echo "📊 备份统计："
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT
    '合集' as 表名,
    COUNT(*) as 备份数量,
    MAX(backup_at) as 最新备份时间
FROM collections_backup
WHERE backup_at >= CURRENT_DATE
UNION ALL
SELECT
    '媒体文件' as 表名,
    COUNT(*) as 备份数量,
    MAX(backup_at) as 最新备份时间
FROM media_files_backup
WHERE backup_at >= CURRENT_DATE
UNION ALL
SELECT
    '用户' as 表名,
    COUNT(*) as 备份数量,
    MAX(backup_at) as 最新备份时间
FROM users_backup
WHERE backup_at >= CURRENT_DATE
UNION ALL
SELECT
    '系统设置' as 表名,
    COUNT(*) as 备份数量,
    MAX(backup_at) as 最新备份时间
FROM settings_backup
WHERE backup_at >= CURRENT_DATE;
EOF

echo ""
echo "✅ 数据备份完成！"
echo "💡 现在可以安全执行: npx prisma migrate reset"
echo "💡 如需恢复数据，请运行: ./scripts/restore-backup.sh"
