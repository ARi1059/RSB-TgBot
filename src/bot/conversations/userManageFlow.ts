import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { createLogger } from '../../utils/logger';
import prisma from '../../database/client';
import { UserLevel } from '../../utils/permissions';

const logger = createLogger('UserManageFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 用户管理流程会话
 */
export async function userManageFlow(conversation: MyConversation, ctx: MyContext) {
  // 请求输入用户名
  const inputKeyboard = new InlineKeyboard()
    .text('❌ 取消', 'user_cancel');

  await ctx.reply(
    '👤 用户管理\n\n' +
    '请输入用户的 Username（不带 @ 符号）\n' +
    '例如：john_doe',
    { reply_markup: inputKeyboard }
  );

  const inputResponse = await conversation.wait();

  // 检查是否点击了取消按钮
  if (inputResponse.callbackQuery?.data === 'user_cancel') {
    await inputResponse.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 操作已取消');
    return;
  }

  let username = inputResponse.message?.text?.trim();

  if (!username) {
    await ctx.reply('❌ 用户名不能为空');
    return;
  }

  // 移除 @ 符号（如果用户输入了）
  if (username.startsWith('@')) {
    username = username.substring(1);
  }

  // 验证用户名格式（只允许字母、数字、下划线）
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    await ctx.reply('❌ 用户名格式错误，只能包含字母、数字和下划线');
    return;
  }

  try {
    // 查找用户（数据库中的username不带@）
    const user = await prisma.user.findFirst({
      where: { username: username }
    });

    if (!user) {
      await ctx.reply(`❌ 未找到用户：@${username}\n\n该用户可能尚未使用过 Bot`);
      return;
    }

    // 显示用户当前信息
    const userLevelText = user.userLevel === UserLevel.VIP ? 'VIP用户'
      : user.userLevel === UserLevel.PAID ? '付费用户'
      : '普通用户';

    await ctx.reply(
      `📋 用户信息\n\n` +
      `用户名：@${user.username || '未设置'}\n` +
      `姓名：${user.firstName || ''} ${user.lastName || ''}\n` +
      `Telegram ID：${user.telegramId}\n` +
      `当前权限：${userLevelText}\n\n` +
      `请选择新的权限等级：`,
      {
        reply_markup: new InlineKeyboard()
          .text('👤 普通用户', `user_level:${user.id}:${UserLevel.NORMAL}`).row()
          .text('💎 付费用户', `user_level:${user.id}:${UserLevel.PAID}`).row()
          .text('👑 VIP用户', `user_level:${user.id}:${UserLevel.VIP}`).row()
          .text('❌ 取消', 'user_cancel')
      }
    );

    const levelResponse = await conversation.wait();

    // 检查是否点击了取消按钮
    if (levelResponse.callbackQuery?.data === 'user_cancel') {
      await levelResponse.answerCallbackQuery({ text: '已取消' });
      await ctx.reply('❌ 操作已取消');
      return;
    }

    if (!levelResponse.callbackQuery?.data?.startsWith('user_level:')) {
      await ctx.reply('❌ 操作已取消');
      return;
    }

    const parts = levelResponse.callbackQuery.data.split(':');
    const userId = parseInt(parts[1]);
    const newLevel = parseInt(parts[2]);

    await levelResponse.answerCallbackQuery();

    // 更新用户权限
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { userLevel: newLevel }
    });

    const newLevelText = newLevel === UserLevel.VIP ? 'VIP用户'
      : newLevel === UserLevel.PAID ? '付费用户'
      : '普通用户';

    await ctx.reply(
      `✅ 用户权限修改成功！\n\n` +
      `用户名：@${updatedUser.username || '未设置'}\n` +
      `新权限：${newLevelText}\n\n` +
      `💡 权限已立即生效，用户可以立即访问对应权限的内容`
    );

    logger.info(`User level updated: username=${updatedUser.username}, telegramId=${updatedUser.telegramId}, newLevel=${newLevel}`);
  } catch (error) {
    logger.error('Failed to manage user', error);
    await ctx.reply('❌ 操作失败，请稍后重试');
  }
}
