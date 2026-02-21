import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import { createLogger } from '../../utils/logger';
import { KeyboardFactory } from '../ui/keyboards/KeyboardFactory';
import sessionPool from '../../services/sessionPool';
import { createNewSession } from '../../userbot/client';

const logger = createLogger('SessionManageFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * Session 管理主菜单
 */
export async function sessionManageFlow(conversation: MyConversation, ctx: MyContext) {
  try {
    await showSessionMenu(ctx);

    while (true) {
      const response = await conversation.wait();

      if (!response.callbackQuery?.data) {
        continue;
      }

      const action = response.callbackQuery.data;

      if (action === 'session:list') {
        await listSessions(ctx);
      } else if (action === 'session:add') {
        await addSessionFlow(conversation, ctx);
        await showSessionMenu(ctx);
      } else if (action === 'session:stats') {
        await showSessionStats(ctx);
      } else if (action.startsWith('session:toggle:')) {
        const sessionId = parseInt(action.split(':')[2]);
        await toggleSessionStatus(ctx, sessionId);
        await listSessions(ctx);
      } else if (action.startsWith('session:delete:')) {
        const sessionId = parseInt(action.split(':')[2]);
        await deleteSessionConfirm(ctx, sessionId);
      } else if (action.startsWith('session:confirm_delete:')) {
        const sessionId = parseInt(action.split(':')[2]);
        await deleteSessionAction(ctx, sessionId);
        await listSessions(ctx);
      } else if (action.startsWith('session:cancel_delete:')) {
        await listSessions(ctx);
      } else if (action.startsWith('session:reset_flood:')) {
        const sessionId = parseInt(action.split(':')[2]);
        await resetFloodWait(ctx, sessionId);
        await listSessions(ctx);
      } else if (action === 'session:back') {
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.editMessageText('✅ 已返回主菜单', { reply_markup: keyboard });
        break;
      }

      await response.answerCallbackQuery();
    }
  } catch (error) {
    logger.error('Session manage flow error', error);
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 操作失败，请稍后重试', { reply_markup: keyboard });
  }
}

/**
 * 显示 Session 管理菜单
 */
async function showSessionMenu(ctx: MyContext) {
  const stats = await sessionPool.getSessionStats();

  const keyboard = new InlineKeyboard()
    .text('📋 查看账号列表', 'session:list').row()
    .text('➕ 添加新账号', 'session:add').row()
    .text('📊 账号统计', 'session:stats').row()
    .text('🔙 返回主菜单', 'session:back');

  const message =
    '🔐 Session 账号管理\n\n' +
    `📊 当前状态：\n` +
    `• 总账号数：${stats.total}\n` +
    `• 已启用：${stats.active}\n` +
    `• 可用：${stats.available}\n` +
    `• 限流中：${stats.floodWaiting}\n\n` +
    '请选择操作：';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, { reply_markup: keyboard });
  } else {
    await ctx.reply(message, { reply_markup: keyboard });
  }
}

/**
 * 列出所有 Session
 */
async function listSessions(ctx: MyContext) {
  const sessions = await sessionPool.getAllSessions();

  if (sessions.length === 0) {
    const keyboard = new InlineKeyboard().text('🔙 返回', 'session:back');
    await ctx.editMessageText('📭 暂无账号，请先添加', { reply_markup: keyboard });
    return;
  }

  let message = '📋 Session 账号列表\n\n';

  for (const session of sessions) {
    const statusIcon = session.isActive ? '✅' : '❌';
    const availableIcon = session.isAvailable ? '🟢' : '🔴';
    const floodInfo = session.floodWaitUntil
      ? `\n  ⏳ 限流至：${new Date(session.floodWaitUntil).toLocaleString('zh-CN')}`
      : '';

    message +=
      `${statusIcon} ${availableIcon} #${session.id} ${session.name}\n` +
      `  📊 总转发：${session.totalTransferred} | 今日：${session.dailyTransferred}\n` +
      `  🎯 优先级：${session.priority}${floodInfo}\n\n`;
  }

  const keyboard = new InlineKeyboard();

  for (const session of sessions) {
    const toggleText = session.isActive ? '🔴 禁用' : '🟢 启用';
    keyboard
      .text(`#${session.id} ${session.name.substring(0, 10)}`, `session:info:${session.id}`)
      .text(toggleText, `session:toggle:${session.id}`)
      .row();

    if (!session.isAvailable && session.floodWaitUntil) {
      keyboard.text('🔄 重置限流', `session:reset_flood:${session.id}`).row();
    }

    keyboard.text('🗑️ 删除', `session:delete:${session.id}`).row();
  }

  keyboard.text('🔙 返回', 'session:back');

  await ctx.editMessageText(message, { reply_markup: keyboard });
}

/**
 * 添加新 Session 流程
 */
async function addSessionFlow(conversation: MyConversation, ctx: MyContext) {
  try {
    // 1. 询问账号名称
    await ctx.editMessageText('请输入账号名称（用于识别）：');
    const nameResponse = await conversation.wait();
    const name = nameResponse.message?.text?.trim();

    if (!name) {
      await ctx.reply('❌ 账号名称不能为空');
      return;
    }

    // 2. 询问 API ID
    await ctx.reply('请输入 API ID：');
    const apiIdResponse = await conversation.wait();
    const apiIdText = apiIdResponse.message?.text?.trim();

    if (!apiIdText || isNaN(parseInt(apiIdText))) {
      await ctx.reply('❌ API ID 必须是数字');
      return;
    }

    const apiId = parseInt(apiIdText);

    // 3. 询问 API Hash
    await ctx.reply('请输入 API Hash：');
    const apiHashResponse = await conversation.wait();
    const apiHash = apiHashResponse.message?.text?.trim();

    if (!apiHash) {
      await ctx.reply('❌ API Hash 不能为空');
      return;
    }

    // 4. 询问优先级
    await ctx.reply('请输入优先级（数字越大优先级越高，默认 0）：');
    const priorityResponse = await conversation.wait();
    const priorityText = priorityResponse.message?.text?.trim();
    const priority = priorityText && !isNaN(parseInt(priorityText)) ? parseInt(priorityText) : 0;

    // 5. 开始登录流程
    await ctx.reply('🔐 开始登录流程...');

    const client = await createNewSession(apiId, apiHash);

    // 6. 发送验证码
    await ctx.reply('请输入手机号（国际格式，如 +8613800138000）：');
    const phoneResponse = await conversation.wait();
    const phone = phoneResponse.message?.text?.trim();

    if (!phone) {
      await ctx.reply('❌ 手机号不能为空');
      await client.disconnect();
      return;
    }

    await client.sendCode(
      {
        apiId,
        apiHash,
      },
      phone
    );

    // 7. 输入验证码
    await ctx.reply('📱 验证码已发送，请输入验证码：');
    const codeResponse = await conversation.wait();
    const code = codeResponse.message?.text?.trim();

    if (!code) {
      await ctx.reply('❌ 验证码不能为空');
      await client.disconnect();
      return;
    }

    // 8. 登录
    try {
      await client.signIn(
        {
          apiId,
          apiHash,
        },
        {
          phoneNumber: async () => phone,
          password: async () => {
            await ctx.reply('🔒 需要两步验证密码，请输入：');
            const passwordResponse = await conversation.wait();
            return passwordResponse.message?.text?.trim() || '';
          },
          phoneCode: async () => code,
          onError: (err: any) => {
            logger.error('Login error', err);
            throw err;
          },
        }
      );

      // 9. 保存 session
      const sessionString = client.session.save() as string;

      await sessionPool.addSession({
        name,
        apiId,
        apiHash,
        sessionString,
        priority,
      });

      await client.disconnect();

      await ctx.reply(`✅ 账号 "${name}" 添加成功！`);
      logger.info(`New session added: ${name}`);
    } catch (error: any) {
      logger.error('Failed to sign in', error);
      await client.disconnect();
      await ctx.reply(`❌ 登录失败：${error.message}`);
    }
  } catch (error) {
    logger.error('Add session flow error', error);
    await ctx.reply('❌ 添加账号失败，请稍后重试');
  }
}

/**
 * 显示 Session 统计
 */
async function showSessionStats(ctx: MyContext) {
  const sessions = await sessionPool.getAllSessions();
  const stats = await sessionPool.getSessionStats();

  let totalTransferred = 0;
  let totalDailyTransferred = 0;

  for (const session of sessions) {
    totalTransferred += session.totalTransferred;
    totalDailyTransferred += session.dailyTransferred;
  }

  const keyboard = new InlineKeyboard().text('🔙 返回', 'session:back');

  const message =
    '📊 Session 账号统计\n\n' +
    `📈 总体统计：\n` +
    `• 总账号数：${stats.total}\n` +
    `• 已启用：${stats.active}\n` +
    `• 可用：${stats.available}\n` +
    `• 限流中：${stats.floodWaiting}\n\n` +
    `📦 转发统计：\n` +
    `• 总转发数：${totalTransferred}\n` +
    `• 今日转发：${totalDailyTransferred}\n` +
    `• 平均每账号：${stats.total > 0 ? Math.floor(totalTransferred / stats.total) : 0}`;

  await ctx.editMessageText(message, { reply_markup: keyboard });
}

/**
 * 切换 Session 启用状态
 */
async function toggleSessionStatus(ctx: MyContext, sessionId: number) {
  try {
    const session = await sessionPool.getSession(sessionId);
    if (!session) {
      await ctx.answerCallbackQuery('❌ 账号不存在');
      return;
    }

    await sessionPool.toggleSession(sessionId, !session.isActive);
    await ctx.answerCallbackQuery(`✅ 账号已${!session.isActive ? '启用' : '禁用'}`);
  } catch (error) {
    logger.error('Toggle session error', error);
    await ctx.answerCallbackQuery('❌ 操作失败');
  }
}

/**
 * 删除 Session 确认
 */
async function deleteSessionConfirm(ctx: MyContext, sessionId: number) {
  const session = await sessionPool.getSession(sessionId);
  if (!session) {
    await ctx.answerCallbackQuery('❌ 账号不存在');
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('✅ 确认删除', `session:confirm_delete:${sessionId}`)
    .text('❌ 取消', `session:cancel_delete:${sessionId}`);

  await ctx.editMessageText(
    `⚠️ 确认删除账号？\n\n` +
    `账号名称：${session.name}\n` +
    `总转发数：${session.totalTransferred}\n\n` +
    `此操作不可恢复！`,
    { reply_markup: keyboard }
  );
}

/**
 * 删除 Session
 */
async function deleteSessionAction(ctx: MyContext, sessionId: number) {
  try {
    await sessionPool.deleteSession(sessionId);
    await ctx.answerCallbackQuery('✅ 账号已删除');
    logger.info(`Session ${sessionId} deleted`);
  } catch (error) {
    logger.error('Delete session error', error);
    await ctx.answerCallbackQuery('❌ 删除失败');
  }
}

/**
 * 重置限流状态
 */
async function resetFloodWait(ctx: MyContext, sessionId: number) {
  try {
    await sessionPool.resetSessionFloodWait(sessionId);
    await ctx.answerCallbackQuery('✅ 限流状态已重置');
    logger.info(`Session ${sessionId} flood wait reset`);
  } catch (error) {
    logger.error('Reset flood wait error', error);
    await ctx.answerCallbackQuery('❌ 重置失败');
  }
}
