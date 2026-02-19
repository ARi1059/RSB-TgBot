import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { createLogger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('ContactManageFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 联系人管理流程会话
 */
export async function contactManageFlow(conversation: MyConversation, ctx: MyContext) {
  // 获取当前联系人
  const currentContact = process.env.ADMIN_CONTACT || '未设置';

  const actionKeyboard = new InlineKeyboard()
    .text('✏️ 修改联系人', 'contact_action:edit')
    .text('➕ 新增联系人', 'contact_action:add').row()
    .text('❌ 取消', 'contact_cancel');

  await ctx.reply(
    '📞 联系人管理\n\n' +
    `当前联系人：${currentContact}\n\n` +
    '请选择操作：',
    { reply_markup: actionKeyboard }
  );

  const actionResponse = await conversation.wait();

  if (!actionResponse.callbackQuery?.data) {
    await ctx.reply('❌ 操作已取消');
    return;
  }

  if (actionResponse.callbackQuery.data === 'contact_cancel') {
    await actionResponse.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 操作已取消');
    return;
  }

  const action = actionResponse.callbackQuery.data.split(':')[1] as 'edit' | 'add';
  await actionResponse.answerCallbackQuery();

  // 请求输入联系人用户名
  const inputKeyboard = new InlineKeyboard()
    .text('❌ 取消', 'contact_cancel');

  await ctx.reply(
    `${action === 'edit' ? '✏️ 修改联系人' : '➕ 新增联系人'}\n\n` +
    '请输入联系人用户名（不带 @ 符号）\n' +
    '例如：admin_username',
    { reply_markup: inputKeyboard }
  );

  const inputResponse = await conversation.wait();

  // 检查是否点击了取消按钮
  if (inputResponse.callbackQuery?.data === 'contact_cancel') {
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
    const envPath = path.join(process.cwd(), '.env');

    // 读取 .env 文件
    if (!fs.existsSync(envPath)) {
      await ctx.reply('❌ .env 文件不存在');
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    let contactLineIndex = -1;

    // 查找 ADMIN_CONTACT 行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('ADMIN_CONTACT=')) {
        contactLineIndex = i;
        break;
      }
    }

    const newContact = `@${username}`;

    if (action === 'edit') {
      // 修改联系人
      if (contactLineIndex === -1) {
        await ctx.reply('⚠️ 未找到 ADMIN_CONTACT 配置，将创建新配置');
        // 在 ADMIN_IDS 后面添加
        const adminIdsIndex = lines.findIndex(line => line.startsWith('ADMIN_IDS='));
        if (adminIdsIndex !== -1) {
          lines.splice(adminIdsIndex + 1, 0, '', `ADMIN_CONTACT=${newContact}`);
        } else {
          lines.push('', `ADMIN_CONTACT=${newContact}`);
        }
      } else {
        lines[contactLineIndex] = `ADMIN_CONTACT=${newContact}`;
      }

      fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');

      // 更新环境变量
      process.env.ADMIN_CONTACT = newContact;

      await ctx.reply(
        `✅ 联系人修改成功！权限已立即生效\n\n` +
        `新联系人：${newContact}\n\n` +
        `💡 提示：\n` +
        `- 新的联系人配置已生效，可以立即使用\n` +
        `- .env 文件已更新，重启后配置将持久化`
      );

      logger.info(`Admin contact updated: ${newContact}`);
    } else {
      // 新增联系人（实际上和修改一样）
      if (contactLineIndex === -1) {
        // 在 ADMIN_IDS 后面添加
        const adminIdsIndex = lines.findIndex(line => line.startsWith('ADMIN_IDS='));
        if (adminIdsIndex !== -1) {
          lines.splice(adminIdsIndex + 1, 0, '', `ADMIN_CONTACT=${newContact}`);
        } else {
          lines.push('', `ADMIN_CONTACT=${newContact}`);
        }
      } else {
        lines[contactLineIndex] = `ADMIN_CONTACT=${newContact}`;
      }

      fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');

      // 更新环境变量
      process.env.ADMIN_CONTACT = newContact;

      await ctx.reply(
        `✅ 联系人添加成功！权限已立即生效\n\n` +
        `联系人：${newContact}\n\n` +
        `💡 提示：\n` +
        `- 新的联系人配置已生效，可以立即使用\n` +
        `- .env 文件已更新，重启后配置将持久化`
      );

      logger.info(`Admin contact added: ${newContact}`);
    }
  } catch (error) {
    logger.error('Failed to manage contact', error);
    await ctx.reply('❌ 操作失败，请稍后重试');
  }
}
