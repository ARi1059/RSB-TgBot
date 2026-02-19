import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import collectionService from '../../services/collection';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SearchCollectionFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 搜索合集流程会话
 */
export async function searchCollectionFlow(conversation: MyConversation, ctx: MyContext) {
  const cancelKeyboard = new InlineKeyboard()
    .text('❌ 取消', 'search_cancel');

  await ctx.reply(
    '🔍 搜索合集\n\n' +
    '请输入搜索关键词（将匹配合集标题和描述）',
    { reply_markup: cancelKeyboard }
  );

  const response = await conversation.wait();

  // 检查是否点击了取消按钮
  if (response.callbackQuery?.data === 'search_cancel') {
    await response.answerCallbackQuery({ text: '已取消搜索' });
    await ctx.reply('❌ 已取消搜索');
    return;
  }

  const keyword = response.message?.text?.trim();

  if (!keyword) {
    await ctx.reply('❌ 关键词不能为空，搜索已取消');
    return;
  }

  try {
    // 搜索合集（匹配标题和描述，全量展示不过滤权限）
    const { collections, total, page, totalPages } = await collectionService.getCollections(
      1,
      10,
      { title: keyword }
    );

    if (collections.length === 0) {
      await ctx.reply(
        `🔍 未找到匹配的合集\n\n` +
        `关键词：${keyword}\n\n` +
        `请尝试其他关键词`
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

    // 构建翻页键盘
    const keyboard = new InlineKeyboard();

    if (page < totalPages) {
      keyboard.text('➡️ 下一页', `search_page:${keyword}:${page + 1}`);
    }

    await ctx.reply(message, {
      reply_markup: keyboard.inline_keyboard.length > 0 ? keyboard : undefined,
    });

    logger.info(`Search completed for keyword: ${keyword}, found ${total} results`);
  } catch (error) {
    logger.error('Failed to search collections', error);
    await ctx.reply('❌ 搜索失败，请稍后重试');
  }
}
