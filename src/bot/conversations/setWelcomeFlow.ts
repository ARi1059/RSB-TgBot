import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import settingService from '../../services/setting';
import Logger from '../../utils/logger';

const logger = new Logger('SetWelcomeFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 设置欢迎消息会话流程
 */
export async function setWelcomeFlow(conversation: MyConversation, ctx: MyContext) {
  const cancelKeyboard = new InlineKeyboard()
    .text('❌ 取消', 'welcome_cancel');

  await ctx.reply(
    '📝 设置欢迎消息\n\n' +
    '请输入新的欢迎消息内容\n\n' +
    '支持的变量：\n' +
    '• {{user_first_name}} - 用户名字\n' +
    '• {{user_last_name}} - 用户姓氏\n' +
    '• {{user_username}} - 用户名',
    { reply_markup: cancelKeyboard }
  );

  const response = await conversation.wait();

  // 检查是否点击了取消按钮
  if (response.callbackQuery?.data === 'welcome_cancel') {
    await response.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 已取消设置');
    return;
  }

  const message = response.message?.text;

  if (!message) {
    await ctx.reply('❌ 消息内容不能为空');
    return;
  }

  try {
    await settingService.setWelcomeMessage(message);
    await ctx.reply(
      '✅ 欢迎消息设置成功！\n\n' +
      '预览：\n' +
      message
    );
    logger.info('Welcome message updated successfully');
  } catch (error) {
    logger.error('Failed to set welcome message', error);
    await ctx.reply('❌ 设置失败，请稍后重试');
  }
}
