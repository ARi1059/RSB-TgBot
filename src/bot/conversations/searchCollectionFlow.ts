import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context } from 'grammy';
import collectionService from '../../services/collection';
import { createLogger } from '../../utils/logger';
import { KeyboardFactory } from '../ui';
import { showCancelWithMenuButton } from '../utils/helpers';

const logger = createLogger('SearchCollectionFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 搜索合集流程会话
 */
export async function searchCollectionFlow(conversation: MyConversation, ctx: MyContext) {
  const cancelKeyboard = KeyboardFactory.createCancelKeyboard('search_cancel');

  await ctx.reply(
    '🔍 搜索合集\n\n' +
    '请输入搜索关键词（将匹配合集标题和描述）',
    { reply_markup: cancelKeyboard }
  );

  const response = await conversation.wait();

  // 检查是否点击了取消按钮
  if (response.callbackQuery?.data === 'search_cancel') {
    await response.answerCallbackQuery({ text: '已取消搜索' });
    await showCancelWithMenuButton(ctx, '❌ 已取消搜索');
    return;
  }

  const keyword = response.message?.text?.trim();

  if (!keyword) {
    await showCancelWithMenuButton(ctx, '❌ 关键词不能为空，搜索已取消');
    return;
  }

  try {
    // 搜索合集（匹配标题和描述，全量展示不过滤权限）
    const { collections, total, page, totalPages } = await collectionService.getCollections(
      1,
      5,
      { title: keyword }
    );

    if (collections.length === 0) {
      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.reply(
        `🔍 未找到匹配的合集\n\n` +
        `关键词：${keyword}\n\n` +
        `请尝试其他关键词`,
        { reply_markup: keyboard }
      );
      return;
    }

    // 构建搜索结果消息
    let message = `🔍 搜索结果（找到 ${total} 个匹配的合集）\n\n`;
    message += `关键词：${keyword}\n\n`;

    for (const collection of collections) {
      const fileCount = (collection as any)._count.mediaFiles;
      const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

      message += `📦 ${collection.title}\n`;
      if (collection.description) {
        message += `   📝 ${collection.description}\n`;
      }
      message += `   📁 ${fileCount} 个文件\n`;
      message += `   🔗 ${deepLink}\n`;
      message += `   📅 ${collection.createdAt.toLocaleDateString()}\n\n`;
    }

    message += `\n📄 第 ${page}/${totalPages} 页`;

    // 使用 KeyboardFactory 构建翻页键盘
    const keyboard = KeyboardFactory.createPaginationKeyboard({
      currentPage: page,
      totalPages,
      prefix: 'search_page',
      keyword
    });

    // 如果有分页按钮，使用分页键盘；否则添加返回菜单按钮
    let finalKeyboard;
    if (keyboard.inline_keyboard.length > 0) {
      // 有分页按钮，在分页按钮下方添加返回菜单按钮
      keyboard.row().text('🏠 返回菜单', 'back_to_menu');
      finalKeyboard = keyboard;
    } else {
      // 没有分页按钮，只显示返回菜单按钮
      finalKeyboard = KeyboardFactory.createBackToMenuKeyboard();
    }

    await ctx.reply(message, {
      reply_markup: finalKeyboard,
    });

    logger.info(`Search completed for keyword: ${keyword}, found ${total} results`);
  } catch (error) {
    logger.error('Failed to search collections', error);
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 搜索失败，请稍后重试', { reply_markup: keyboard });
  }
}
