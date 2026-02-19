import { Bot } from 'grammy';
import { createLogger } from '../../utils/logger';
import { Config } from '../../config';
import { MyContext } from '../middlewares/session';
import { adminOnly } from '../middlewares/auth';
import collectionService from '../../services/collection';
import { showEditCollectionUI } from '../utils/helpers';
import { KeyboardFactory } from '../ui/keyboards/KeyboardFactory';
import { CollectionMessageBuilder } from '../ui/builders/CollectionMessageBuilder';

const logger = createLogger('AdminCommands');

/**
 * 注册管理员命令
 */
export function registerAdminCommands(bot: Bot<MyContext>): void {
  // /upload 命令（管理员）
  bot.command('upload', adminOnly, async (ctx) => {
    await ctx.conversation.enter('uploadFlow');
  });

  // /display 命令（管理员）
  bot.command('display', adminOnly, async (ctx) => {
    const { collections, total, page, totalPages } = await collectionService.getCollections(1, 10);

    if (collections.length === 0) {
      await ctx.reply('📭 暂无合集');
      return;
    }

    let message = `📚 合集列表（共 ${total} 个）\n\n`;

    for (const collection of collections) {
      const fileCount = (collection as any)._count.mediaFiles;
      message += `📦 ${collection.title}\n`;
      message += `   📁 ${fileCount} 个文件\n`;
      message += `   🔗 t.me/${Config.BOT_USERNAME}?start=${collection.token}\n`;
      message += `   📅 ${collection.createdAt.toLocaleDateString()}\n`;
      message += `   ID: ${collection.id}\n\n`;
    }

    message += `第 ${page}/${totalPages} 页`;

    await ctx.reply(message);
  });

  // /publish 命令（管理员）
  bot.command('publish', adminOnly, async (ctx) => {
    await ctx.conversation.enter('publishFlow');
  });

  // /setwelcome 命令（管理员）
  bot.command('setwelcome', adminOnly, async (ctx) => {
    await ctx.conversation.enter('setWelcomeFlow');
  });

  // /edit 命令（管理员）
  bot.command('edit', adminOnly, async (ctx) => {
    const collectionId = parseInt(ctx.match as string);

    if (!collectionId || isNaN(collectionId)) {
      await ctx.reply('❌ 请提供合集 ID\n用法: /edit <ID>');
      return;
    }

    // 检查合集是否存在
    const collection = await collectionService.getCollectionById(collectionId);

    if (!collection) {
      await ctx.reply('❌ 合集不存在');
      return;
    }

    // 显示合集信息和文件列表
    await showEditCollectionUI(ctx, collection, collectionId);
  });

  // /delete 命令（管理员）
  bot.command('delete', adminOnly, async (ctx) => {
    const collectionId = parseInt(ctx.match as string);

    if (!collectionId || isNaN(collectionId)) {
      await ctx.reply('❌ 请提供合集 ID\n用法: /delete <ID>');
      return;
    }

    // 检查合集是否存在
    const collection = await collectionService.getCollectionById(collectionId);

    if (!collection) {
      await ctx.reply('❌ 合集不存在');
      return;
    }

    // 请求确认
    const keyboard = KeyboardFactory.createConfirmKeyboard(
      `confirm_delete:${collectionId}`,
      `cancel_delete:${collectionId}`
    );

    await ctx.reply(
      CollectionMessageBuilder.buildDeleteConfirmMessage(collection),
      { reply_markup: keyboard }
    );
  });

  // /transfer 命令（管理员）
  bot.command('transfer', adminOnly, async (ctx) => {
    await ctx.conversation.enter('transferFlow');
  });
}
