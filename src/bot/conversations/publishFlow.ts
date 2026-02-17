import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context } from 'grammy';
import userService from '../../services/user';
import { renderTemplate } from '../../utils/template';
import Logger from '../../utils/logger';

const logger = new Logger('PublishFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 全员推送流程
 */
export async function publishFlow(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply(
    '📢 全员推送\n\n' +
    '请输入要推送的消息内容：\n' +
    '支持 Premium Emoji 和占位符（如 {{user_first_name}}）\n\n' +
    '输入 /cancel 取消推送'
  );

  // 等待消息内容
  const response = await conversation.wait();

  if (response.message?.text === '/cancel') {
    await ctx.reply('❌ 已取消推送');
    return;
  }

  const messageContent = response.message?.text;

  if (!messageContent) {
    await ctx.reply('❌ 消息内容不能为空');
    return;
  }

  // 确认推送
  await ctx.reply(
    `📋 预览消息：\n\n${messageContent}\n\n` +
    '确认推送吗？\n' +
    '回复 yes 确认，其他内容取消'
  );

  const confirmResponse = await conversation.wait();

  if (confirmResponse.message?.text?.toLowerCase() !== 'yes') {
    await ctx.reply('❌ 已取消推送');
    return;
  }

  // 获取所有激活用户
  const users = await userService.getActiveUsers();

  await ctx.reply(`📤 开始推送，共 ${users.length} 个用户...`);

  let successCount = 0;
  let failCount = 0;

  // 分批推送，避免限流
  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      // 渲染模板
      const renderedMessage = renderTemplate(messageContent, {
        user_first_name: user.firstName || '',
        user_last_name: user.lastName || '',
        user_username: user.username || '',
      });

      // 发送消息
      await ctx.api.sendMessage(user.telegramId.toString(), renderedMessage);
      successCount++;

      // 每 30 条消息暂停 1 秒，避免限流
      if ((i + 1) % 30 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      failCount++;
      logger.error(`Failed to send message to user ${user.telegramId}`, error);

      // 如果用户 block 了 bot，标记为非激活
      if (error.error_code === 403) {
        await userService.deactivateUser(Number(user.telegramId));
        logger.info(`User ${user.telegramId} deactivated (blocked bot)`);
      }
    }
  }

  await ctx.reply(
    `✅ 推送完成！\n\n` +
    `📊 统计：\n` +
    `✅ 成功：${successCount}\n` +
    `❌ 失败：${failCount}\n` +
    `📝 总计：${users.length}`
  );

  logger.info(`Publish completed: ${successCount} success, ${failCount} failed`);
}
