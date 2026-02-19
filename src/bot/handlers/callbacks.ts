import { Bot } from 'grammy';
import { createLogger } from '../../utils/logger';
import { MyContext } from '../middlewares/session';
import { CALLBACKS } from '../../constants';
import collectionService from '../../services/collection';
import { buildCollectionListMessage, showCancelWithMenuButton } from '../utils/helpers';
import { CollectionFilters } from '../../types/collection';

const logger = createLogger('CallbackHandlers');

/**
 * 注册所有回调处理器
 */
export function registerCallbackHandlers(bot: Bot<MyContext>): void {
  // Conversation 内部的回调列表
  const conversationCallbacks = [
    'publish_confirm',
    'publish_cancel',
    'upload_cancel',
    'upload_cancel_start',
    'upload_skip',
    'upload_perm:',
    'add_button',
    'button_done',
    'edit_cancel',
    'edit_skip',
    'welcome_cancel',
    'search_cancel',
    'transfer_cancel',
    'transfer_mode:',
    'transfer_date:',
    'transfer_content:',
    'transfer_skip',
    'transfer_confirm:',
    'admin_action:',
    'admin_cancel',
    'contact_action:',
    'contact_cancel',
    'user_level:',
    'user_cancel',
  ];

  // 只处理非 conversation 的回调
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data;

    // 检查是否是 conversation 内部回调
    const isConversationCallback = conversationCallbacks.some(prefix => data.startsWith(prefix) || data === prefix);
    if (isConversationCallback) {
      // 不处理，传递给下一个中间件（conversation）
      return next();
    }

    // 处理全局回调
    try {
      if (data.startsWith('cmd:')) {
        await handleCommandCallback(ctx, data);
        return;
      }

      // 翻页回调
      if (data.startsWith('page:') || data.startsWith('search_page:')) {
        await handlePaginationCallback(ctx, data);
        return;
      }

      // 合集分页回调（深链接访问时的下一页）
      if (data.startsWith('collection_next:')) {
        await handleCollectionNextCallback(ctx, data);
        return;
      }

      // 搜索取消回调
      if (data === 'search_cancel') {
        await handleSearchCancelCallback(ctx);
        return;
      }

      // 编辑合集回调
      if (data.startsWith('edit_collection:')) {
        await handleEditCollectionCallback(ctx, data);
        return;
      }

      // 编辑元数据回调
      if (data.startsWith('edit_meta:')) {
        await handleEditMetaCallback(ctx, data);
        return;
      }

      // 删除合集回调
      if (data.startsWith('delete_collection:')) {
        await handleDeleteCollectionCallback(ctx, data);
        return;
      }

      // 删除媒体文件回调
      if (data.startsWith('delete_media:')) {
        await handleDeleteMediaCallback(ctx, data);
        return;
      }

      // 确认删除媒体文件回调
      if (data.startsWith('confirm_delete_media:')) {
        await handleConfirmDeleteMediaCallback(ctx, data);
        return;
      }

      // 取消删除媒体文件回调
      if (data.startsWith('cancel_delete_media:')) {
        await handleCancelDeleteMediaCallback(ctx, data);
        return;
      }

      // 返回菜单回调
      if (data === 'back_to_menu') {
        await handleBackToMenuCallback(ctx);
        return;
      }

      // 编辑合集回调
      else if (data.startsWith('edit_title:')) {
        await handleEditTitleCallback(ctx, data);
      } else if (data.startsWith('edit_desc:')) {
        await handleEditDescCallback(ctx, data);
      } else if (data.startsWith('edit_files:')) {
        await handleEditFilesCallback(ctx, data);
      } else if (data.startsWith('edit_permission:')) {
        await handleEditPermissionCallback(ctx, data);
      } else if (data.startsWith('edit_back:')) {
        await handleEditBackCallback(ctx, data);
      }
      // 删除合集回调
      else if (data.startsWith('confirm_delete:')) {
        await handleConfirmDeleteCallback(ctx, data);
      } else if (data.startsWith('cancel_delete:')) {
        await handleCancelDeleteCallback(ctx, data);
      }
      // 删除文件回调
      else if (data.startsWith('delete_file:')) {
        await handleDeleteFileCallback(ctx, data);
      } else if (data.startsWith('confirm_delete_file:')) {
        await handleConfirmDeleteFileCallback(ctx, data);
      } else if (data.startsWith('cancel_delete_file:')) {
        await handleCancelDeleteFileCallback(ctx, data);
      }
      // 编辑文件权限回调
      else if (data.startsWith('edit_file_permission:')) {
        await handleEditFilePermissionCallback(ctx, data);
      } else if (data.startsWith('set_file_permission:')) {
        await handleSetFilePermissionCallback(ctx, data);
      } else if (data.startsWith('cancel_edit_file_permission:')) {
        await handleCancelEditFilePermissionCallback(ctx, data);
      }
      // 设置合集权限回调
      else if (data.startsWith('set_collection_permission:')) {
        await handleSetCollectionPermissionCallback(ctx, data);
      } else if (data.startsWith('cancel_set_collection_permission:')) {
        await handleCancelSetCollectionPermissionCallback(ctx, data);
      }

      await ctx.answerCallbackQuery();
    } catch (error) {
      logger.error('Callback handler error', error);
      await ctx.answerCallbackQuery({ text: '❌ 操作失败' });
    }
  });
}

/**
 * 处理命令按钮回调（cmd: 开头）
 */
async function handleCommandCallback(ctx: MyContext, data: string): Promise<void> {
  const command = data.split(':')[1];

  // 检查是否为管理员
  const userId = ctx.from?.id;
  if (!userId) return;

  const permissionService = (await import('../../services/permission')).default;
  const isAdmin = permissionService.isAdmin(userId);

  switch (command) {
    case 'list':
      await handleListCallback(ctx);
      break;

    case 'upload':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('uploadFlow');
      break;

    case 'publish':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('publishFlow');
      break;

    case 'setwelcome':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('setWelcomeFlow');
      break;

    case 'transfer':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('transferFlow');
      break;

    case 'search':
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('searchCollectionFlow');
      break;

    case 'admin_manage':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('adminManageFlow');
      break;

    case 'contact_manage':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('contactManageFlow');
      break;

    case 'user_manage':
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.conversation.enter('userManageFlow');
      break;

    default:
      await ctx.answerCallbackQuery({ text: '❌ 未知命令' });
  }
}

/**
 * 处理列表回调
 */
async function handleListCallback(ctx: MyContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const permissionService = (await import('../../services/permission')).default;
  const isAdmin = permissionService.isAdmin(userId);

  logger.info(`[handleListCallback] userId: ${userId}, isAdmin: ${isAdmin}`);

  const { collections, total, page, totalPages } = await collectionService.getCollections(1, 5);

  if (collections.length === 0) {
    await ctx.answerCallbackQuery({ text: '📭 暂无合集' });
    return;
  }

  const { message, keyboard } = buildCollectionListMessage(collections, total, page, totalPages, undefined, isAdmin);
  await ctx.answerCallbackQuery();
  await ctx.reply(message, { reply_markup: keyboard });
}

/**
 * 处理翻页回调
 */
async function handlePaginationCallback(ctx: MyContext, data: string): Promise<void> {
  const parts = data.split(':');
  const keyword = parts[1] || '';
  const page = parseInt(parts[2]);

  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const permissionService = (await import('../../services/permission')).default;
    const isAdmin = permissionService.isAdmin(userId);

    // 全量展示，不过滤权限
    const filters: CollectionFilters | undefined = keyword ? { title: keyword } : undefined;
    const { collections, total, page: currentPage, totalPages } = await collectionService.getCollections(page, 5, filters);

    if (collections.length === 0) {
      await ctx.answerCallbackQuery({ text: '没有更多结果了' });
      return;
    }

    const { message, keyboard } = buildCollectionListMessage(collections, total, currentPage, totalPages, keyword, isAdmin);
    await ctx.editMessageText(message, { reply_markup: keyboard });
  } catch (error) {
    logger.error('Pagination error', error);
    await ctx.answerCallbackQuery({ text: '❌ 加载失败' });
  }
}

/**
 * 处理搜索取消回调
 */
async function handleSearchCancelCallback(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery({ text: '已取消搜索' });
}

/**
 * 处理返回菜单回调
 */
async function handleBackToMenuCallback(ctx: MyContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const permissionService = (await import('../../services/permission')).default;
  const settingService = (await import('../../services/setting')).default;
  const { renderTemplate } = await import('../../utils/template');
  const { KeyboardFactory } = await import('../ui/keyboards/KeyboardFactory');

  const isAdmin = permissionService.isAdmin(userId);

  // 获取欢迎消息
  const welcomeMessage = await settingService.getWelcomeMessage();

  // 构建主菜单键盘
  const keyboard = KeyboardFactory.createMainMenuKeyboard(isAdmin);

  try {
    // 尝试解析为 JSON（新格式，包含 entities）
    const messageData = JSON.parse(welcomeMessage);

    // 渲染文本中的变量
    const renderedText = renderTemplate(messageData.text, {
      user_first_name: ctx.from?.first_name || '',
      user_last_name: ctx.from?.last_name || '',
      user_username: ctx.from?.username || '',
    });

    // 发送消息，包含 entities
    await ctx.editMessageText(renderedText, {
      entities: messageData.entities, // 传递消息实体（包括 Premium Emoji）
      reply_markup: keyboard,
    });
  } catch (error) {
    // 如果解析失败，说明是旧格式（纯文本）
    const renderedMessage = renderTemplate(welcomeMessage, {
      user_first_name: ctx.from?.first_name || '',
      user_last_name: ctx.from?.last_name || '',
      user_username: ctx.from?.username || '',
    });

    await ctx.editMessageText(renderedMessage, { reply_markup: keyboard });
  }

  await ctx.answerCallbackQuery({ text: '已返回主菜单' });
}


/**
 * 显示取消消息并返回菜单的辅助函数(用于带caption的消息)
 */
async function showCancelCaptionAndReturnToMenu(ctx: MyContext, cancelMessage: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const permissionService = (await import('../../services/permission')).default;
  const settingService = (await import('../../services/setting')).default;
  const { renderTemplate } = await import('../../utils/template');
  const { KeyboardFactory } = await import('../ui/keyboards/KeyboardFactory');

  const isAdmin = permissionService.isAdmin(userId);

  // 先显示取消消息
  await ctx.editMessageCaption({ caption: cancelMessage });
  await ctx.answerCallbackQuery({ text: '已取消' });

  // 延迟1秒后返回菜单
  setTimeout(async () => {
    try {
      const welcomeMessage = await settingService.getWelcomeMessage();
      const renderedMessage = renderTemplate(welcomeMessage, {
        user_first_name: ctx.from?.first_name || '',
        user_last_name: ctx.from?.last_name || '',
        user_username: ctx.from?.username || '',
      });

      const keyboard = KeyboardFactory.createMainMenuKeyboard(isAdmin);
      await ctx.reply(renderedMessage, { reply_markup: keyboard });
    } catch (error) {
      logger.error('Failed to return to menu after cancel', error);
    }
  }, 1000);
}

// 由于回调处理器太多，这里只实现核心的几个
// 其他回调处理器保留在主文件中，或者可以进一步拆分

async function handleEditTitleCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('editCollectionFlow');
}

async function handleEditDescCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('editCollectionFlow');
}

async function handleEditFilesCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('📝 文件管理功能开发中...');
}

async function handleEditPermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('🔐 权限管理功能开发中...');
}

async function handleEditBackCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('✅ 已返回');
}

async function handleConfirmDeleteCallback(ctx: MyContext, data: string): Promise<void> {
  const collectionId = parseInt(data.split(':')[1]);

  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const permissionService = (await import('../../services/permission')).default;
    const isAdmin = permissionService.isAdmin(userId);
    const effectiveUserLevel = isAdmin ? 2 : 0; // 管理员使用VIP权限

    const collection = await collectionService.getCollectionById(collectionId, effectiveUserLevel);
    if (!collection) {
      await ctx.answerCallbackQuery({ text: '❌ 合集不存在' });
      return;
    }

    await collectionService.deleteCollection(collectionId);

    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard().text('🏠 返回菜单', 'back_to_menu');

    await ctx.editMessageText(
      `✅ 合集已删除\n\n` +
      `📦 标题：${collection.title}\n` +
      `📁 文件数量：${collection.mediaFiles.length}`,
      { reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery({ text: '✅ 删除成功' });
  } catch (error) {
    logger.error('Failed to delete collection', error);
    await ctx.answerCallbackQuery({ text: '❌ 删除失败' });
  }
}

async function handleCancelDeleteCallback(ctx: MyContext, data: string): Promise<void> {
  await showCancelWithMenuButton(ctx, '❌ 已取消删除');
}

async function handleDeleteFileCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('🗑️ 文件删除功能开发中...');
}

async function handleConfirmDeleteFileCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ 文件已删除');
}

async function handleCancelDeleteFileCallback(ctx: MyContext, data: string): Promise<void> {
  await showCancelWithMenuButton(ctx, '❌ 已取消删除');
}

async function handleEditFilePermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('🔐 文件权限编辑功能开发中...');
}

async function handleSetFilePermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ 文件权限已设置');
}

async function handleCancelEditFilePermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await showCancelWithMenuButton(ctx, '❌ 已取消');
}

async function handleSetCollectionPermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ 合集权限已设置');
}

async function handleCancelSetCollectionPermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await showCancelWithMenuButton(ctx, '❌ 已取消');
}

// ========== 补充遗漏的回调处理函数 ==========

async function handleEditCollectionCallback(ctx: MyContext, data: string): Promise<void> {
  const collectionId = parseInt(data.split(':')[1]);
  const userId = ctx.from?.id;

  const permissionService = (await import('../../services/permission')).default;
  const { showEditCollectionUI } = await import('../utils/helpers');

  if (!userId || !permissionService.isAdmin(userId)) {
    await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
    return;
  }

  const isAdmin = permissionService.isAdmin(userId);
  const effectiveUserLevel = isAdmin ? 2 : 0; // 管理员使用VIP权限

  const collection = await collectionService.getCollectionById(collectionId, effectiveUserLevel);
  if (!collection) {
    await ctx.answerCallbackQuery({ text: '❌ 合集不存在' });
    return;
  }

  await showEditCollectionUI(ctx, collection, collectionId);
  await ctx.answerCallbackQuery();
}

async function handleEditMetaCallback(ctx: MyContext, data: string): Promise<void> {
  const collectionId = parseInt(data.split(':')[1]);
  (ctx.session as any).editCollectionId = collectionId;
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('editCollectionFlow');
}

async function handleDeleteCollectionCallback(ctx: MyContext, data: string): Promise<void> {
  const collectionId = parseInt(data.split(':')[1]);
  const userId = ctx.from?.id;

  const permissionService = (await import('../../services/permission')).default;
  const { KeyboardFactory } = await import('../ui/keyboards/KeyboardFactory');
  const { CollectionMessageBuilder } = await import('../ui/builders/CollectionMessageBuilder');

  if (!userId || !permissionService.isAdmin(userId)) {
    await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
    return;
  }

  try {
    const isAdmin = permissionService.isAdmin(userId);
    const effectiveUserLevel = isAdmin ? 2 : 0; // 管理员使用VIP权限

    const collection = await collectionService.getCollectionById(collectionId, effectiveUserLevel);
    if (!collection) {
      await ctx.answerCallbackQuery({ text: '❌ 合集不存在' });
      return;
    }

    const keyboard = KeyboardFactory.createConfirmKeyboard(
      `confirm_delete:${collectionId}`,
      `cancel_delete:${collectionId}`
    );

    await ctx.reply(
      CollectionMessageBuilder.buildDeleteConfirmMessage(collection),
      { reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Failed to handle delete button', error);
    await ctx.answerCallbackQuery({ text: '❌ 操作失败' });
  }
}

async function handleDeleteMediaCallback(ctx: MyContext, data: string): Promise<void> {
  const mediaId = parseInt(data.split(':')[1]);
  const mediaService = (await import('../../services/media')).default;
  const { KeyboardFactory } = await import('../ui/keyboards/KeyboardFactory');
  const { getFileTypeEmoji } = await import('../utils/helpers');

  try {
    const media = await mediaService.getMediaFile(mediaId);
    if (!media) {
      await ctx.answerCallbackQuery({ text: '❌ 文件不存在' });
      return;
    }

    const keyboard = KeyboardFactory.createConfirmKeyboard(
      `confirm_delete_media:${mediaId}`,
      `cancel_delete_media:${media.collectionId}`
    );

    const fileTypeEmoji = getFileTypeEmoji(media.fileType);
    const confirmMessage =
      `⚠️ 确认删除此文件？\n\n` +
      `${fileTypeEmoji} 类型：${media.fileType}\n` +
      `📦 所属合集：${media.collection.title}\n` +
      `🆔 文件 ID：${mediaId}\n\n` +
      `此操作不可撤销！`;

    if (media.fileType === 'photo') {
      await ctx.replyWithPhoto(media.fileId, { caption: confirmMessage, reply_markup: keyboard });
    } else if (media.fileType === 'video') {
      await ctx.replyWithVideo(media.fileId, { caption: confirmMessage, reply_markup: keyboard });
    } else if (media.fileType === 'audio') {
      await ctx.replyWithAudio(media.fileId, { caption: confirmMessage, reply_markup: keyboard });
    } else if (media.fileType === 'document') {
      await ctx.replyWithDocument(media.fileId, { caption: confirmMessage, reply_markup: keyboard });
    } else {
      await ctx.reply(confirmMessage, { reply_markup: keyboard });
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Failed to handle delete media button', error);
    await ctx.answerCallbackQuery({ text: '❌ 操作失败' });
  }
}

async function handleConfirmDeleteMediaCallback(ctx: MyContext, data: string): Promise<void> {
  const mediaId = parseInt(data.split(':')[1]);
  const mediaService = (await import('../../services/media')).default;

  try {
    const media = await mediaService.getMediaFile(mediaId);
    if (!media) {
      await ctx.answerCallbackQuery({ text: '❌ 文件不存在' });
      return;
    }

    const collectionId = media.collectionId;
    await mediaService.deleteMediaFile(mediaId);

    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard().text('🏠 返回菜单', 'back_to_menu');

    await ctx.editMessageCaption({
      caption: `✅ 文件已删除\n\n类型：${media.fileType}\n所属合集：${media.collection.title}`,
      reply_markup: keyboard
    });

    await ctx.answerCallbackQuery({ text: '✅ 删除成功' });
    logger.info(`Media file ${mediaId} deleted from collection ${collectionId}`);
  } catch (error) {
    logger.error('Failed to delete media file', error);
    await ctx.answerCallbackQuery({ text: '❌ 删除失败，请重试' });
  }
}

async function handleCancelDeleteMediaCallback(ctx: MyContext, data: string): Promise<void> {
  await showCancelCaptionAndReturnToMenu(ctx, '❌ 已取消删除');
}

/**
 * 处理合集下一页回调（深链接访问时的分页）
 * 格式: collection_next:token:pageIndex
 */
async function handleCollectionNextCallback(ctx: MyContext, data: string): Promise<void> {
  const parts = data.split(':');
  const token = parts[1];
  const pageIndex = parseInt(parts[2]);

  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userService = (await import('../../services/user')).default;
    const permissionService = (await import('../../services/permission')).default;
    const user = await userService.getOrCreateUser(userId, {});

    // 管理员获得VIP权限
    const isAdmin = permissionService.isAdmin(userId);
    const effectiveUserLevel = isAdmin ? 2 : user.userLevel;

    // 获取合集（带权限验证）
    const collection = await collectionService.getCollectionByToken(token, effectiveUserLevel);
    if (!collection) {
      await ctx.answerCallbackQuery({ text: '❌ 合集不存在或已被删除' });
      return;
    }

    const { sendMediaGroup } = await import('../handlers/media');
    const { InlineKeyboard } = await import('grammy');

    // 准备媒体文件数组
    const mediaFiles = collection.mediaFiles.map((media: any) => ({
      fileId: media.fileId,
      fileType: media.fileType,
    }));

    const MEDIA_GROUP_LIMIT = 10;
    const totalFiles = mediaFiles.length;
    const startIndex = (pageIndex + 1) * MEDIA_GROUP_LIMIT;
    const endIndex = Math.min(startIndex + MEDIA_GROUP_LIMIT, totalFiles);
    const currentPageFiles = mediaFiles.slice(startIndex, endIndex);

    if (currentPageFiles.length === 0) {
      await ctx.answerCallbackQuery({ text: '❌ 没有更多文件了' });
      return;
    }

    // 发送当前页文件
    await sendMediaGroup(ctx, currentPageFiles);

    // 判断是否还有下一页
    const hasNextPage = endIndex < totalFiles;

    if (hasNextPage) {
      // 还有下一页，显示下一页按钮和返回菜单按钮
      const keyboard = new InlineKeyboard()
        .text('📄 下一页', `collection_next:${token}:${pageIndex + 1}`)
        .text('🏠 返回菜单', 'back_to_menu');

      await ctx.reply(
        `✅ 已发放 ${endIndex}/${totalFiles} 个文件`,
        { reply_markup: keyboard }
      );
    } else {
      // 最后一页，显示返回菜单按钮
      const keyboard = new InlineKeyboard()
        .text('🏠 返回菜单', 'back_to_menu');

      await ctx.reply(
        `✅ 已全部发放！共 ${totalFiles} 个文件`,
        { reply_markup: keyboard }
      );
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Failed to handle collection next callback', error);
    await ctx.answerCallbackQuery({ text: '❌ 加载失败' });
  }
}
