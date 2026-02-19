import { Bot } from 'grammy';
import { MyContext } from '../middlewares/session';
import { createLogger } from '../../utils/logger';
import customerService from '../../services/customerService';
import userService from '../../services/user';
import permissionService from '../../services/permission';

const logger = createLogger('MessageHandlers');

/**
 * 注册消息处理器
 */
export function registerMessageHandlers(bot: Bot<MyContext>): void {
  bot.on('message', async (ctx) => {
    await handleMessage(ctx);
  });
}

/**
 * 处理消息
 */
async function handleMessage(ctx: MyContext): Promise<void> {
  const userId = ctx.from?.id;
  const message = ctx.message;

  if (!userId || !message) return;

  const isAdmin = permissionService.isAdmin(userId);

  // 管理员回复转发的消息
  if (isAdmin && message.reply_to_message) {
    await handleAdminReply(ctx);
    return;
  }

  // 普通用户发送消息
  if (!isAdmin) {
    await handleUserMessage(ctx);
  }
}

/**
 * 处理普通用户消息 - 转发给所有管理员
 */
async function handleUserMessage(ctx: MyContext): Promise<void> {
  try {
    const userId = ctx.from!.id;
    const message = ctx.message!;

    const user = await userService.getOrCreateUser(userId, {
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      username: ctx.from?.username,
    });

    const adminIds = permissionService.getAdminIdList();
    if (adminIds.length === 0) return;

    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '未知用户';
    const userInfo = `👤 用户消息\n\n` +
      `姓名：${userName}\n` +
      `用户名：${user.username ? '@' + user.username : '无'}\n` +
      `ID：${user.telegramId}\n` +
      `等级：${customerService.getUserLevelText(user.userLevel)}\n` +
      `时间：${new Date().toLocaleString('zh-CN')}\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `💡 回复此消息即可回复用户`;

    for (const adminId of adminIds) {
      try {
        await ctx.api.sendMessage(adminId, userInfo);
        const forwardedMessage = await ctx.api.forwardMessage(
          adminId,
          message.chat.id,
          message.message_id
        );

        customerService.recordForwardedMessage(
          Number(user.telegramId),
          message.message_id,
          forwardedMessage.message_id
        );
      } catch (error) {
        logger.error(`Failed to forward message to admin ${adminId}`, error);
      }
    }
  } catch (error) {
    logger.error('Failed to handle user message', error);
  }
}

/**
 * 处理管理员回复 - 发送给原用户
 */
async function handleAdminReply(ctx: MyContext): Promise<void> {
  try {
    const replyToMessage = ctx.message!.reply_to_message!;
    const adminMessage = ctx.message!;

    const originalUserId = customerService.getUserIdByForwardedMessage(replyToMessage.message_id);

    if (!originalUserId) {
      await ctx.reply('❌ 无法找到原用户，消息可能已过期（24小时）');
      return;
    }

    try {
      await sendMessageToUser(ctx, originalUserId, adminMessage);
      await ctx.reply('✅ 回复已发送给用户');
    } catch (error) {
      await ctx.reply('❌ 发送失败，用户可能已停止机器人');
      logger.error(`Failed to send admin reply to user ${originalUserId}`, error);
    }
  } catch (error) {
    logger.error('Failed to handle admin reply', error);
    await ctx.reply('❌ 处理回复失败');
  }
}

/**
 * 发送消息给用户
 */
async function sendMessageToUser(ctx: MyContext, userId: number, message: any): Promise<void> {
  if (message.text) {
    await ctx.api.sendMessage(userId, message.text);
  } else if (message.photo) {
    await ctx.api.sendPhoto(userId, message.photo[message.photo.length - 1].file_id, {
      caption: message.caption,
    });
  } else if (message.video) {
    await ctx.api.sendVideo(userId, message.video.file_id, {
      caption: message.caption,
    });
  } else if (message.audio) {
    await ctx.api.sendAudio(userId, message.audio.file_id, {
      caption: message.caption,
    });
  } else if (message.document) {
    await ctx.api.sendDocument(userId, message.document.file_id, {
      caption: message.caption,
    });
  } else if (message.voice) {
    await ctx.api.sendVoice(userId, message.voice.file_id);
  } else if (message.sticker) {
    await ctx.api.sendSticker(userId, message.sticker.file_id);
  } else {
    await ctx.api.forwardMessage(userId, message.chat.id, message.message_id);
  }
}
