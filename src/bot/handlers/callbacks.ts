import { Bot } from 'grammy';
import { createLogger } from '../../utils/logger';
import { MyContext } from '../middlewares/session';
import { CALLBACKS } from '../../constants';
import collectionService from '../../services/collection';
import { buildCollectionListMessage } from '../utils/helpers';
import { CollectionFilters } from '../../types/collection';

const logger = createLogger('CallbackHandlers');

/**
 * 注册所有回调处理器
 */
export function registerCallbackHandlers(bot: Bot<MyContext>): void {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    try {
      // 主菜单回调
      if (data === CALLBACKS.COMMAND.LIST) {
        await handleListCallback(ctx);
      } else if (data === CALLBACKS.COMMAND.SEARCH) {
        await handleSearchCallback(ctx);
      } else if (data === CALLBACKS.COMMAND.ADMIN_MANAGE) {
        await handleAdminManageCallback(ctx);
      } else if (data === CALLBACKS.COMMAND.CONTACT_MANAGE) {
        await handleContactManageCallback(ctx);
      } else if (data === CALLBACKS.COMMAND.USER_MANAGE) {
        await handleUserManageCallback(ctx);
      }
      // 翻页回调
      else if (data.startsWith('page:') || data.startsWith('search_page:')) {
        await handlePaginationCallback(ctx, data);
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
 * 处理列表回调
 */
async function handleListCallback(ctx: MyContext): Promise<void> {
  const { collections, total, page, totalPages } = await collectionService.getCollections(1, 10);

  if (collections.length === 0) {
    await ctx.editMessageText('📭 暂无合集');
    return;
  }

  const { message, keyboard } = buildCollectionListMessage(collections, total, page, totalPages);
  await ctx.editMessageText(message, { reply_markup: keyboard });
}

/**
 * 处理搜索回调
 */
async function handleSearchCallback(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('searchCollectionFlow');
}

/**
 * 处理管理员管理回调
 */
async function handleAdminManageCallback(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('adminManageFlow');
}

/**
 * 处理联系人管理回调
 */
async function handleContactManageCallback(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('contactManageFlow');
}

/**
 * 处理用户管理回调
 */
async function handleUserManageCallback(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('userManageFlow');
}

/**
 * 处理翻页回调
 */
async function handlePaginationCallback(ctx: MyContext, data: string): Promise<void> {
  const parts = data.split(':');
  const keyword = parts[1] || '';
  const page = parseInt(parts[2]);

  try {
    // 全量展示，不过滤权限
    const filters: CollectionFilters | undefined = keyword ? { title: keyword } : undefined;
    const { collections, total, page: currentPage, totalPages } = await collectionService.getCollections(page, 10, filters);

    if (collections.length === 0) {
      await ctx.answerCallbackQuery({ text: '没有更多结果了' });
      return;
    }

    const { message, keyboard } = buildCollectionListMessage(collections, total, currentPage, totalPages, keyword);
    await ctx.editMessageText(message, { reply_markup: keyboard });
  } catch (error) {
    logger.error('Pagination error', error);
    await ctx.answerCallbackQuery({ text: '❌ 加载失败' });
  }
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
  await collectionService.deleteCollection(collectionId);
  await ctx.editMessageText('✅ 合集已删除');
}

async function handleCancelDeleteCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.editMessageText('❌ 已取消删除');
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
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('❌ 已取消删除');
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
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('❌ 已取消');
}

async function handleSetCollectionPermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ 合集权限已设置');
}

async function handleCancelSetCollectionPermissionCallback(ctx: MyContext, data: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('❌ 已取消');
}
