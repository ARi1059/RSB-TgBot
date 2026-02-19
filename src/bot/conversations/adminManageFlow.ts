import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { createLogger } from '../../utils/logger';
import permissionService from '../../services/permission';
import { KeyboardFactory } from '../ui';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('AdminManageFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 管理员管理流程会话
 */
export async function adminManageFlow(conversation: MyConversation, ctx: MyContext) {
  const actionKeyboard = new InlineKeyboard()
    .text('➕ 添加管理员', 'admin_action:add')
    .text('➖ 删除管理员', 'admin_action:remove').row()
    .text('❌ 取消', 'admin_cancel');

  // 获取当前管理员列表
  const currentAdmins = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];

  await ctx.reply(
    '👥 管理员管理\n\n' +
    `当前管理员ID列表：\n${currentAdmins.join('\n')}\n\n` +
    '请选择操作：',
    { reply_markup: actionKeyboard }
  );

  const actionResponse = await conversation.wait();

  if (!actionResponse.callbackQuery?.data) {
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 操作已取消', { reply_markup: keyboard });
    return;
  }

  if (actionResponse.callbackQuery.data === 'admin_cancel') {
    await actionResponse.answerCallbackQuery({ text: '已取消' });
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 操作已取消', { reply_markup: keyboard });
    return;
  }

  const action = actionResponse.callbackQuery.data.split(':')[1] as 'add' | 'remove';
  await actionResponse.answerCallbackQuery();

  // 请求输入用户ID
  const inputKeyboard = KeyboardFactory.createCancelKeyboard('admin_cancel');

  await ctx.reply(
    `${action === 'add' ? '➕ 添加管理员' : '➖ 删除管理员'}\n\n` +
    '请输入用户ID（纯数字）：',
    { reply_markup: inputKeyboard }
  );

  const inputResponse = await conversation.wait();

  // 检查是否点击了取消按钮
  if (inputResponse.callbackQuery?.data === 'admin_cancel') {
    await inputResponse.answerCallbackQuery({ text: '已取消' });
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 操作已取消', { reply_markup: keyboard });
    return;
  }

  const userId = inputResponse.message?.text?.trim();

  if (!userId) {
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 用户ID不能为空', { reply_markup: keyboard });
    return;
  }

  // 验证是否为纯数字
  if (!/^\d+$/.test(userId)) {
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 用户ID必须是纯数字', { reply_markup: keyboard });
    return;
  }

  try {
    const envPath = path.join(process.cwd(), '.env');

    // 读取 .env 文件
    if (!fs.existsSync(envPath)) {
      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.reply('❌ .env 文件不存在', { reply_markup: keyboard });
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    let adminLineIndex = -1;
    let adminIds: string[] = [];

    // 查找 ADMIN_IDS 行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('ADMIN_IDS=')) {
        adminLineIndex = i;
        const value = lines[i].substring('ADMIN_IDS='.length).trim();
        adminIds = value ? value.split(',').map(id => id.trim()) : [];
        break;
      }
    }

    if (adminLineIndex === -1) {
      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.reply('❌ 未找到 ADMIN_IDS 配置', { reply_markup: keyboard });
      return;
    }

    if (action === 'add') {
      // 添加管理员
      if (adminIds.includes(userId)) {
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.reply('⚠️ 该用户已经是管理员', { reply_markup: keyboard });
        return;
      }

      adminIds.push(userId);
      lines[adminLineIndex] = `ADMIN_IDS=${adminIds.join(',')}`;

      fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');

      // 更新环境变量
      process.env.ADMIN_IDS = adminIds.join(',');

      // 刷新权限服务缓存
      permissionService.refreshCache();

      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.reply(
        `✅ 添加成功！权限已立即生效\n\n` +
        `用户ID：${userId}\n\n` +
        `当前管理员列表：\n${adminIds.join('\n')}\n\n` +
        `💡 提示：\n` +
        `- 新的权限配置已生效，可以立即使用\n` +
        `- .env 文件已更新，重启后配置将持久化`,
        { reply_markup: keyboard }
      );

      logger.info(`Admin added: ${userId}`);
    } else {
      // 删除管理员
      if (!adminIds.includes(userId)) {
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.reply('⚠️ 该用户不是管理员', { reply_markup: keyboard });
        return;
      }

      // 检查是否是最后一个管理员
      if (adminIds.length === 1) {
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.reply('❌ 不能删除最后一个管理员', { reply_markup: keyboard });
        return;
      }

      adminIds = adminIds.filter(id => id !== userId);
      lines[adminLineIndex] = `ADMIN_IDS=${adminIds.join(',')}`;

      fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');

      // 更新环境变量
      process.env.ADMIN_IDS = adminIds.join(',');

      // 刷新权限服务缓存
      permissionService.refreshCache();

      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.reply(
        `✅ 删除成功！权限已立即生效\n\n` +
        `用户ID：${userId}\n\n` +
        `当前管理员列表：\n${adminIds.join('\n')}\n\n` +
        `💡 提示：\n` +
        `- 新的权限配置已生效，可以立即使用\n` +
        `- .env 文件已更新，重启后配置将持久化`,
        { reply_markup: keyboard }
      );

      logger.info(`Admin removed: ${userId}`);
    }
  } catch (error) {
    logger.error('Failed to manage admin', error);
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 操作失败，请稍后重试', { reply_markup: keyboard });
  }
}
