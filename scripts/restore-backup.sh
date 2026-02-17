#!/bin/bash

# 数据恢复脚本
# 从备份表恢复数据到主表

echo "🔄 开始恢复数据..."

# 获取数据库连接信息
source .env
DB_URL=$DATABASE_URL

# 解析数据库连接字符串
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD=$DB_PASS

echo "📊 数据库: $DB_NAME"
echo "🏠 主机: $DB_HOST:$DB_PORT"
echo ""

# 检查备份表是否存在
echo "🔍 检查备份表..."
BACKUP_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'collections_backup'")

if [ "$BACKUP_EXISTS" -eq "0" ]; then
    echo "❌ 错误：备份表不存在！"
    echo "💡 请先运行: ./scripts/backup-data.sh"
    exit 1
fi

# 显示可用的备份
echo "📅 可用的备份："
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT
    DATE(backup_at) as 备份日期,
    COUNT(*) as 合集数量
FROM collections_backup
GROUP BY DATE(backup_at)
ORDER BY DATE(backup_at) DESC
LIMIT 10;
EOF

echo ""
read -p "❓ 是否恢复最新的备份数据？(y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ 已取消恢复"
    exit 0
fi

echo ""
echo "🔄 开始恢复数据..."

# 1. 恢复用户数据（先恢复，因为其他表依赖用户）
echo "👥 恢复用户数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at)
SELECT DISTINCT ON (telegram_id)
    telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at
FROM users_backup
ORDER BY telegram_id, backup_at DESC
ON CONFLICT (telegram_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    username = EXCLUDED.username,
    is_admin = EXCLUDED.is_admin,
    is_active = EXCLUDED.is_active;
EOF

# 2. 恢复合集数据
echo "💾 恢复合集数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
-- 创建临时映射表（旧ID -> 新ID）
CREATE TEMP TABLE collection_id_mapping AS
WITH latest_backups AS (
    SELECT DISTINCT ON (token)
        original_id, token, title, description, creator_id, created_at, updated_at
    FROM collections_backup
    ORDER BY token, backup_at DESC
)
INSERT INTO collections (token, title, description, creator_id, created_at, updated_at)
SELECT token, title, description,
    (SELECT id FROM users WHERE telegram_id = (SELECT telegram_id FROM users_backup WHERE original_id = lb.creator_id LIMIT 1)),
    created_at, updated_at
FROM latest_backups lb
ON CONFLICT (token) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description
RETURNING id as new_id, token;
EOF

# 3. 恢复媒体文件数据
echo "🎬 恢复媒体文件数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO media_files (collection_id, file_id, unique_file_id, file_type, "order", created_at)
SELECT
    c.id as collection_id,
    mfb.file_id,
    mfb.unique_file_id,
    mfb.file_type,
    mfb."order",
    mfb.created_at
FROM (
    SELECT DISTINCT ON (unique_file_id)
        collection_id, file_id, unique_file_id, file_type, "order", created_at
    FROM media_files_backup
    ORDER BY unique_file_id, backup_at DESC
) mfb
JOIN collections_backup cb ON cb.original_id = mfb.collection_id
JOIN collections c ON c.token = cb.token
ON CONFLICT (unique_file_id) DO NOTHING;
EOF

# 4. 恢复系统设置
echo "⚙️  恢复系统设置..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO settings (key, value, created_at, updated_at)
SELECT DISTINCT ON (key)
    key, value, created_at, updated_at
FROM settings_backup
ORDER BY key, backup_at DESC
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
EOF

# 统计恢复结果
echo ""
echo "📊 恢复统计："
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT '用户' as 表名, COUNT(*) as 记录数 FROM users
UNION ALL
SELECT '合集' as 表名, COUNT(*) as 记录数 FROM collections
UNION ALL
SELECT '媒体文件' as 表名, COUNT(*) as 记录数 FROM media_files
UNION ALL
SELECT '系统设置' as 表名, COUNT(*) as 记录数 FROM settings;
EOF

echo ""
echo "✅ 数据恢复完成！"
echo "💡 建议重新生成 Prisma Client: npx prisma generate"
