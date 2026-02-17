@echo off
REM Windows 版本的数据备份脚本

echo 🔄 开始备份数据...

REM 检查 .env 文件
if not exist .env (
    echo ❌ 错误：.env 文件不存在！
    exit /b 1
)

REM 读取 DATABASE_URL
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DB_URL=%%a

echo 📊 数据库连接: %DB_URL%
echo.

REM 创建备份表
echo 📋 创建备份表结构...
psql "%DB_URL%" -f prisma/backup-schema.sql

REM 备份合集数据
echo 💾 备份合集数据...
psql "%DB_URL%" -c "INSERT INTO collections_backup (original_id, token, title, description, creator_id, created_at, updated_at) SELECT id, token, title, description, creator_id, created_at, updated_at FROM collections ON CONFLICT (original_id, backup_at) DO NOTHING;"

REM 备份媒体文件数据
echo 🎬 备份媒体文件数据...
psql "%DB_URL%" -c "INSERT INTO media_files_backup (original_id, collection_id, file_id, unique_file_id, file_type, \"order\", created_at) SELECT id, collection_id, file_id, unique_file_id, file_type, \"order\", created_at FROM media_files ON CONFLICT (original_id, backup_at) DO NOTHING;"

REM 备份用户数据
echo 👥 备份用户数据...
psql "%DB_URL%" -c "INSERT INTO users_backup (original_id, telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at) SELECT id, telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at FROM users ON CONFLICT (original_id, backup_at) DO NOTHING;"

REM 备份系统设置
echo ⚙️  备份系统设置...
psql "%DB_URL%" -c "INSERT INTO settings_backup (original_id, key, value, created_at, updated_at) SELECT id, key, value, created_at, updated_at FROM settings ON CONFLICT (original_id, backup_at) DO NOTHING;"

echo.
echo ✅ 数据备份完成！
echo 💡 现在可以安全执行: npx prisma migrate reset
echo 💡 如需恢复数据，请运行: scripts\restore-backup.bat
pause
