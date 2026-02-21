# 功能检查清单

> **重要提示**：在进行代码优化、重构或删除代码之前，请务必参考此清单，确保不会误删任何功能！

## 📋 核心功能清单

### 1. 用户访问与展示功能

- [ ] **深链访问合集**
  - 文件：`src/bot/commands/start.ts` - `handleDeepLink` 函数
  - 功能：用户通过深链接访问合集，查看文件
  - 关键点：
    - ✅ 权限验证（用户等级 vs 合集/文件权限）
    - ✅ 管理员获得最高权限（VIP）
    - ✅ 分页发送文件（每页10个）
    - ✅ 分页按钮（上一页/下一页）
    - ✅ 返回菜单按钮
    - ✅ 显示可访问和受限文件统计

- [ ] **合集列表展示**
  - 文件：`src/bot/utils/helpers.ts` - `buildCollectionListMessage` 函数
  - 功能：显示所有合集列表（分页）
  - 关键点：
    - ✅ 分页显示（每页5个）
    - ✅ 翻页按钮
    - ✅ 管理员可见编辑/删除按钮
    - ✅ 显示文件统计（图片/视频数量）
    - ✅ 显示深链接

- [ ] **搜索合集**
  - 文件：`src/bot/conversations/searchCollectionFlow.ts`
  - 功能：按关键词搜索合集
  - 关键点：
    - ✅ 搜索标题和描述
    - ✅ 分页显示搜索结果
    - ✅ 支持取消操作

### 2. 管理员功能

- [ ] **上传文件**
  - 文件：`src/bot/conversations/uploadFlow.ts`
  - 功能：上传媒体文件并创建合集
  - 关键点：
    - ✅ 支持多种媒体类型（photo/video/document/audio）
    - ✅ 文件去重（基于 unique_file_id）
    - ✅ 权限选择（免费/付费/VIP）
    - ✅ 标题相同自动追加文件
    - ✅ 生成固定深链 token
    - ✅ 自动发送到私密频道（全量）
    - ✅ 不发送到公开频道（已移除）

- [ ] **编辑合集**
  - 文件：`src/bot/conversations/editCollectionFlow.ts`
  - 功能：编辑合集标题、描述
  - 关键点：
    - ✅ 显示合集信息
    - ✅ 编辑标题/描述
    - ✅ 显示文件列表
    - ✅ 删除单个文件
    - ✅ 编辑文件权限
    - ✅ 管理员专属

- [ ] **删除合集**
  - 文件：`src/bot/handlers/callbacks.ts` - `handleDeleteCollectionCallback`
  - 功能：删除整个合集
  - 关键点：
    - ✅ 需要确认
    - ✅ 删除合集及所有文件
    - ✅ 管理员专属

- [ ] **全员推送**
  - 文件：`src/bot/conversations/publishFlow.ts`
  - 功能：向所有用户推送消息
  - 关键点：
    - ✅ 支持占位符渲染
    - ✅ 支持 Premium Emoji
    - ✅ 分批发送（避免限流）
    - ✅ 自动标记已屏蔽用户

- [ ] **频道搬运**
  - 文件：`src/bot/conversations/transferFlow.ts` 和 `transferExecuteFlow.ts`
  - 功能：从其他频道搬运内容
  - 关键点：
    - ✅ 全频道搬运 / 按日期范围搬运
    - ✅ 内容类型过滤（全部/图片/视频）
    - ✅ 关键字过滤
    - ✅ 自动创建合集
    - ✅ 实时进度显示
    - ✅ 只发送到私密频道（不发送到公开频道）

- [ ] **设置欢迎语**
  - 文件：`src/bot/conversations/setWelcomeFlow.ts`
  - 功能：自定义欢迎消息
  - 关键点：
    - ✅ 支持占位符（user_first_name, user_last_name, user_username）
    - ✅ 支持 Premium Emoji
    - ✅ 实时预览

- [ ] **管理员管理**
  - 文件：`src/bot/conversations/adminManageFlow.ts`
  - 功能：添加/删除管理员
  - 关键点：
    - ✅ 显示当前管理员列表
    - ✅ 添加/删除管理员
    - ✅ 即时生效（无需重启）
    - ✅ .env 文件自动更新
    - ✅ 不能删除最后一个管理员

- [ ] **联系人管理**
  - 文件：`src/bot/conversations/contactManageFlow.ts`
  - 功能：设置管理员联系方式
  - 关键点：
    - ✅ 显示当前联系人
    - ✅ 修改联系人
    - ✅ 即时生效（无需重启）
    - ✅ .env 文件自动更新

- [ ] **用户管理**
  - 文件：`src/bot/conversations/userManageFlow.ts`
  - 功能：管理用户权限等级
  - 关键点：
    - ✅ 输入用户名查询用户
    - ✅ 显示用户信息
    - ✅ 修改权限等级（普通/付费/VIP）
    - ✅ 即时生效

### 3. 权限系统

- [ ] **用户等级**
  - 文件：`src/utils/permissions.ts`
  - 等级：0-普通, 1-付费, 2-VIP
  - 关键点：
    - ✅ 用户表 user_level 字段
    - ✅ 权限检查函数

- [ ] **内容权限**
  - 文件：`src/utils/permissions.ts`
  - 等级：0-普通, 1-付费, 2-VIP
  - 关键点：
    - ✅ 合集表 permission_level 字段
    - ✅ 文件表 permission_level 字段
    - ✅ 双重权限控制（合集级+文件级）

- [ ] **权限检查**
  - 文件：`src/services/collection.ts`
  - 逻辑：user_level >= permission_level
  - 关键点：
    - ✅ getCollectionByToken 权限过滤
    - ✅ getCollectionById 权限过滤
    - ✅ 管理员获得最高权限

### 4. 媒体处理

- [ ] **媒体文件发送**
  - 文件：`src/bot/handlers/media.ts`
  - 功能：发送媒体文件
  - 关键点：
    - ✅ sendMediaGroup 函数（分批发送，每批10个）
    - ✅ 速率限制（避免 429 错误）
    - ✅ 重试机制（最多3次）
    - ✅ 失败时逐个发送

- [ ] **媒体去重**
  - 文件：`src/services/media.ts`
  - 功能：基于 unique_file_id 去重
  - 关键点：
    - ✅ checkDuplicate 函数
    - ✅ 数据库唯一索引

### 5. 频道发布

- [ ] **私密频道发布**
  - 文件：`src/services/channelPublisher.ts`
  - 功能：发送到私密频道（全量）
  - 关键点：
    - ✅ publishToPrivateChannel 函数
    - ✅ 分批发送（每批10个）
    - ✅ 自定义文本

- [ ] **公开频道发布**
  - 状态：❌ 已移除
  - 原因：用户需求，不再需要公开频道功能

### 6. 回调处理

- [ ] **分页回调**
  - 文件：`src/bot/handlers/callbacks.ts`
  - 功能：处理各种分页按钮
  - 关键点：
    - ✅ page: 合集列表翻页
    - ✅ search_page: 搜索结果翻页
    - ✅ media_page: 资源分发翻页（新增）
    - ✅ collection_next: 旧版分页（保留兼容）

- [ ] **编辑/删除回调**
  - 文件：`src/bot/handlers/callbacks.ts`
  - 功能：处理编辑和删除操作
  - 关键点：
    - ✅ edit_collection: 编辑合集
    - ✅ delete_collection: 删除合集
    - ✅ delete_media: 删除文件
    - ✅ edit_file_permission: 编辑文件权限

- [ ] **返回菜单回调**
  - 文件：`src/bot/handlers/callbacks.ts`
  - 功能：返回主菜单
  - 关键点：
    - ✅ back_to_menu: 返回主菜单
    - ✅ 显示欢迎消息
    - ✅ 显示功能按钮

### 7. 双向客服功能

- [ ] **客服消息转发**
  - 文件：`src/bot/handlers/messages.ts`
  - 功能：用户消息自动转发给管理员
  - 关键点：
    - ✅ 非管理员消息自动转发
    - ✅ 管理员回复转发消息
    - ✅ 消息映射（24小时TTL）
    - ✅ 无需会话状态

## 🔍 检查方法

### 在删除代码前：

1. **搜索函数引用**
   ```bash
   # 搜索函数名在哪些地方被调用
   grep -r "functionName" src/
   ```

2. **检查导入语句**
   ```bash
   # 搜索文件是否被导入
   grep -r "from.*fileName" src/
   ```

3. **查看 Git 历史**
   ```bash
   # 查看文件的修改历史
   git log --oneline -- path/to/file.ts

   # 查看具体修改内容
   git show commit_hash:path/to/file.ts
   ```

4. **对比功能清单**
   - 参考本文档的功能清单
   - 参考 `需求.md` 文档
   - 确认要删除的代码不在功能清单中

### 在优化代码后：

1. **运行 TypeScript 编译检查**
   ```bash
   npx tsc --noEmit
   ```

2. **测试所有功能**
   - 按照功能清单逐项测试
   - 特别注意分页、权限、回调等功能

3. **检查日志输出**
   - 启动 Bot 后检查是否有错误日志
   - 测试功能时观察日志输出

## ⚠️ 常见误删场景

### 1. 删除"无用"的辅助函数
- **风险**：可能被其他地方间接调用
- **检查**：全局搜索函数名

### 2. 删除"重复"的代码
- **风险**：可能是不同场景的实现
- **检查**：理解代码上下文和调用场景

### 3. 删除"过时"的功能
- **风险**：可能仍在使用
- **检查**：查看 Git 历史和需求文档

### 4. 简化"复杂"的逻辑
- **风险**：可能丢失边界情况处理
- **检查**：理解原有逻辑的完整性

## 📝 优化建议

### 安全的优化方式：

1. **重构而非删除**
   - 提取公共函数
   - 优化代码结构
   - 改善命名

2. **渐进式优化**
   - 一次只改一个功能
   - 每次改动后测试
   - 及时提交 Git

3. **保留注释**
   - 标记为 deprecated 而非直接删除
   - 添加迁移说明
   - 保留一段时间后再删除

4. **文档先行**
   - 先更新文档
   - 再修改代码
   - 确保文档和代码一致

## 🎯 本次修复记录

### 问题：资源分发分页功能丢失

**原因**：在之前的某次优化中，可能误删或未实现分页按钮功能

**修复**：
- 在 `src/bot/commands/start.ts` 中添加 `sendMediaPage` 函数
- 实现分页发送（每页10个文件）
- 添加上一页/下一页按钮
- 在 `src/bot/handlers/callbacks.ts` 中注册 `media_page:` 回调

**教训**：
- 优化前必须检查功能清单
- 不能只看代码是否"无用"，要看功能是否完整
- 分页功能是核心用户体验，不能缺失

### 问题：管理员权限不足

**原因**：深链访问时使用 `user.userLevel`，管理员在数据库中可能不是 VIP

**修复**：
- 在所有权限检查的地方，管理员获得最高权限（VIP）
- 修改 `src/bot/commands/start.ts` 中的 `handleDeepLink` 和 `handleMediaPageCallback`
- 修改 `src/bot/handlers/callbacks.ts` 中的 `handleCollectionNextCallback`

**教训**：
- 管理员应该在所有地方获得最高权限
- 权限检查要考虑特殊角色

## ✅ 最后提醒

**在进行任何代码优化之前，请务必：**

1. ✅ 阅读本文档
2. ✅ 阅读 `需求.md`
3. ✅ 搜索函数引用
4. ✅ 查看 Git 历史
5. ✅ 运行编译检查
6. ✅ 测试所有功能
7. ✅ 及时提交 Git

**记住：功能完整性 > 代码简洁性**
