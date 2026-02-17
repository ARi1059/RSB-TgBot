@echo off
REM Windows 版本的数据恢复脚本

echo 🔄 开始恢复数据...

REM 检查 .env 文件
if not exist .env (
    echo ❌ 错误：.env 文件不存在！
    exit /b 1
)

REM 读取 DATABASE_URL
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DB_URL=%%a

echo 📊 数据库连接: %DB_URL%
echo.

REM 检查备份表是否存在
echo 🔍 检查备份表...
psql "%DB_URL%" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'collections_backup'" > temp.txt
set /p BACKUP_EXISTS=<temp.txt
del temp.txt

if "%BACKUP_EXISTS%"=="0" (
    echo ❌ 错误：备份表不存在！
    echo 💡 请先运行: scripts\backup-data.bat
    pause
    exit /b 1
)

echo 📅 可用的备份：
psql "%DB_URL%" -c "SELECT DATE(backup_at) as 备份日期, COUNT(*) as 合集数量 FROM collections_backup GROUP BY DATE(backup_at) ORDER BY DATE(backup_at) DESC LIMIT 10;"

echo.
set /p confirm="❓ 是否恢复最新的备份数据？(y/n): "

if not "%confirm%"=="y" (
    echo ❌ 已取消恢复
    pause
    exit /b 0
)

echo.
echo 🔄 开始恢复数据...

REM 恢复用户数据
echo 👥 恢复用户数据...
psql "%DB_URL%" -c "INSERT INTO users (telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at) SELECT DISTINCT ON (telegram_id) telegram_id, first_name, last_name, username, is_admin, is_active, activated_at, created_at, updated_at FROM users_backup ORDER BY telegram_id, backup_at DESC ON CONFLICT (telegram_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, username = EXCLUDED.username, is_admin = EXCLUDED.is_admin, is_active = EXCLUDED.is_active;"

REM 恢复合集数据
echo 💾 恢复合集数据...
psql "%DB_URL%" -c "WITH latest_backups AS (SELECT DISTINCT ON (token) original_id, token, title, description, creator_id, created_at, updated_at FROM collections_backup ORDER BY token, backup_at DESC) INSERT INTO collections (token, title, description, creator_id, created_at, updated_at) SELECT token, title, description, (SELECT id FROM users WHERE telegram_id = (SELECT telegram_id FROM users_backup WHERE original_id = lb.creator_id LIMIT 1)), created_at, updated_at FROM latest_backups lb ON CONFLICT (token) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;"

REM 恢复媒体文件数据
echo 🎬 恢复媒体文件数据...
psql "%DB_URL%" -c "INSERT INTO media_files (collection_id, file_id, unique_file_id, file_type, \"order\", created_at) SELECT c.id as collection_id, mfb.file_id, mfb.unique_file_id, mfb.file_type, mfb.\"order\", mfb.created_at FROM (SELECT DISTINCT ON (unique_file_id) collection_id, file_id, unique_file_id, file_type, \"order\", created_at FROM media_files_backup ORDER BY unique_file_id, backup_at DESC) mfb JOIN collections_backup cb ON cb.original_id = mfb.collection_id JOIN collections c ON c.token = cb.token ON CONFLICT (unique_file_id) DO NOTHING;"

REM 恢复系统设置
echo ⚙️  恢复系统设置...
psql "%DB_URL%" -c "INSERT INTO settings (key, value, created_at, updated_at) SELECT DISTINCT ON (key) key, value, created_at, updated_at FROM settings_backup ORDER BY key, backup_at DESC ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;"

echo.
echo 📊 恢复统计：
psql "%DB_URL%" -c "SELECT '用户' as 表名, COUNT(*) as 记录数 FROM users UNION ALL SELECT '合集' as 表名, COUNT(*) as 记录数 FROM collections UNION ALL SELECT '媒体文件' as 表名, COUNT(*) as 记录数 FROM media_files UNION ALL SELECT '系统设置' as 表名, COUNT(*) as 记录数 FROM settings;"

echo.
echo ✅ 数据恢复完成！
echo 💡 建议重新生成 Prisma Client: npx prisma generate
pause
