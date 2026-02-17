-- 备份表结构
-- 这些表不会被 Prisma migrate reset 清空

-- 合集备份表
CREATE TABLE IF NOT EXISTS collections_backup (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    backup_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(original_id, backup_at)
);

-- 媒体文件备份表
CREATE TABLE IF NOT EXISTS media_files_backup (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    file_id TEXT NOT NULL,
    unique_file_id TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    backup_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(original_id, backup_at)
);

-- 用户备份表
CREATE TABLE IF NOT EXISTS users_backup (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    telegram_id BIGINT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    backup_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(original_id, backup_at)
);

-- 系统设置备份表
CREATE TABLE IF NOT EXISTS settings_backup (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    backup_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(original_id, backup_at)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_collections_backup_original_id ON collections_backup(original_id);
CREATE INDEX IF NOT EXISTS idx_media_files_backup_original_id ON media_files_backup(original_id);
CREATE INDEX IF NOT EXISTS idx_users_backup_original_id ON users_backup(original_id);
CREATE INDEX IF NOT EXISTS idx_settings_backup_original_id ON settings_backup(original_id);
