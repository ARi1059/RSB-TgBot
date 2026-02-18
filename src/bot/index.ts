import { Bot } from 'grammy';
import { config } from 'dotenv';
import { createConversation } from '@grammyjs/conversations';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { InlineKeyboard } from 'grammy';
import Logger from '../utils/logger';
import { setupSession, MyContext } from './middlewares/session';
import { adminOnly } from './middlewares/auth';
import userService from '../services/user';
import settingService from '../services/setting';
import collectionService from '../services/collection';
import { renderTemplate } from '../utils/template';
import { uploadFlow } from './conversations/uploadFlow';
import { publishFlow } from './conversations/publishFlow';
import { setWelcomeFlow } from './conversations/setWelcomeFlow';
import { editCollectionFlow } from './conversations/editCollectionFlow';
import { transferFlow } from './conversations/transferFlow';
import { transferExecuteFlow } from './conversations/transferExecuteFlow';
import { sendMediaGroup } from './handlers/media';
import mediaService from '../services/media';

// 加载环境变量
config();

const logger = new Logger('Bot');

// 配置代理（如果设置了 HTTP_PROXY 或 HTTPS_PROXY）
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const botConfig: any = {
  client: {}
};

if (proxyUrl) {
  logger.info(`Using proxy: ${proxyUrl}`);
  const agent = new HttpsProxyAgent(proxyUrl);
  botConfig.client.baseFetchConfig = {
    agent,
    compress: true,
  };
}

// 创建 Bot 实例
const bot = new Bot<MyContext>(process.env.BOT_TOKEN!, botConfig);

// 配置会话
setupSession(bot);

// 注册会话流程
bot.use(createConversation(uploadFlow));
bot.use(createConversation(publishFlow));
bot.use(createConversation(setWelcomeFlow));
bot.use(createConversation(editCollectionFlow));
bot.use(createConversation(transferFlow));
bot.use(createConversation(transferExecuteFlow));

// 工具函数：获取文件类型对应的 emoji
function getFileTypeEmoji(fileType: string): string {
  switch (fileType) {
    case 'photo': return '🖼️';
    case 'video': return '🎥';
    case 'audio': return '🎵';
    default: return '📄';
  }
}

// 工具函数：检查用户是否为管理员
function isUserAdmin(userId: number): boolean {
  const adminIds = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
  return adminIds.includes(userId);
}

// 工具函数：构建删除合集确认消息
function buildDeleteConfirmMessage(collection: any): string {
  return `⚠️ 确认删除合集？\n\n` +
    `📦 标题：${collection.title}\n` +
    `📁 文件数量：${collection.mediaFiles.length}\n\n` +
    `此操作不可撤销！`;
}

// 工具函数：显示编辑合集界面
async function showEditCollectionUI(ctx: any, collection: any, collectionId: number) {
  let message = `📝 编辑合集\n\n`;
  message += `📦 标题：${collection.title}\n`;
  message += `📝 描述：${collection.description || '无'}\n`;
  message += `📁 文件数量：${collection.mediaFiles.length}\n\n`;
  message += `文件列表：\n`;

  for (const media of collection.mediaFiles) {
    const fileTypeEmoji = getFileTypeEmoji(media.fileType);
    message += `${fileTypeEmoji} ID: ${media.id} - ${media.fileType}\n`;
  }

  const keyboard = new InlineKeyboard()
    .text('✏️ 编辑标题/描述', `edit_meta:${collectionId}`).row();

  for (let i = 0; i < collection.mediaFiles.length; i++) {
    const media = collection.mediaFiles[i];
    const fileTypeEmoji = getFileTypeEmoji(media.fileType);
    keyboard.text(`🗑️ ${fileTypeEmoji} ${media.id}`, `delete_media:${media.id}`);

    if (i % 2 === 1 || i === collection.mediaFiles.length - 1) {
      keyboard.row();
    }
  }

  await ctx.reply(message, { reply_markup: keyboard });
}

// /start 命令
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // 获取或创建用户
  await userService.getOrCreateUser(userId, {
    firstName: ctx.from?.first_name,
    lastName: ctx.from?.last_name,
    username: ctx.from?.username,
  });

  // 检查是否有深链参数
  const startParam = ctx.match;

  if (startParam) {
    // 深链访问 - 展示合集
    const collection = await collectionService.getCollectionByToken(startParam as string);

    if (!collection) {
      await ctx.reply('❌ 合集不存在或已被删除');
      return;
    }

    // 发送合集信息
    await ctx.reply(
      `📦 合集：${collection.title}\n` +
      `📝 描述：${collection.description || '无'}\n` +
      `📁 文件数量：${collection.mediaFiles.length}\n\n` +
      `正在发送文件...`
    );

    // 准备媒体文件数组
    const mediaFiles = collection.mediaFiles.map(media => ({
      fileId: media.fileId,
      fileType: media.fileType,
    }));

    // 以媒体组形式发送所有文件
    try {
      await sendMediaGroup(ctx, mediaFiles);
      await ctx.reply('✅ 所有文件发送完成！');
    } catch (error) {
      logger.error('Failed to send media group', error);
      await ctx.reply('❌ 部分文件发送失败');
    }
  } else {
    // 普通访问 - 显示欢迎消息和命令按钮
    const welcomeMessage = await settingService.getWelcomeMessage();
    const renderedMessage = renderTemplate(welcomeMessage, {
      user_first_name: ctx.from?.first_name || '',
      user_last_name: ctx.from?.last_name || '',
      user_username: ctx.from?.username || '',
    });

    // 检查是否为管理员
    const isAdmin = isUserAdmin(userId);

    // 构建命令按钮键盘
    const keyboard = new InlineKeyboard()
      .text('📚 查看合集列表', 'cmd:list').row();

    if (isAdmin) {
      keyboard
        .text('📤 上传文件', 'cmd:upload')
        .text('📢 发布合集', 'cmd:publish').row()
        .text('🚀 频道搬运', 'cmd:transfer')
        .text('✏️ 设置欢迎语', 'cmd:setwelcome').row();
    }

    await ctx.reply(renderedMessage, {
      reply_markup: keyboard,
    });
  }
});

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
    message += `   🔗 t.me/${process.env.BOT_USERNAME}?start=${collection.token}\n`;
    message += `   📅 ${collection.createdAt.toLocaleDateString()}\n`;
    message += `   ID: ${collection.id}\n\n`;
  }

  message += `第 ${page}/${totalPages} 页\n\n`;
  message += `💡 使用 /edit <ID> 编辑合集\n`;
  message += `💡 使用 /delete <ID> 删除合集`;

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
  const keyboard = new InlineKeyboard()
    .text('✅ 确认删除', `confirm_delete:${collectionId}`)
    .text('❌ 取消', `cancel_delete:${collectionId}`);

  await ctx.reply(
    buildDeleteConfirmMessage(collection),
    { reply_markup: keyboard }
  );
});

// /transfer 命令（管理员）
bot.command('transfer', adminOnly, async (ctx) => {
  await ctx.conversation.enter('transferFlow');
});

// /start_transfer_receive 命令（内部使用，由 UserBot 调用，触发 Bot 开启会话）
bot.command('start_transfer_receive', async (ctx) => {
  try {
    // 解析配置参数
    const configStr = ctx.match?.toString();
    if (!configStr) {
      logger.warn('No config provided in start_transfer_receive command');
      return;
    }

    const config = JSON.parse(configStr);

    // 将配置保存到 session
    (ctx.session as any).transferConfig = config;

    logger.info('Received start_transfer_receive command from UserBot, entering transferExecuteFlow conversation');
    await ctx.conversation.enter('transferExecuteFlow');
  } catch (error) {
    logger.error('Failed to enter transferExecuteFlow conversation', error);
  }
});

// 辅助函数：构建合集列表消息和键盘
function buildCollectionListMessage(collections: any[], total: number, page: number, totalPages: number, keyword?: string, isAdmin: boolean = false) {
  let message = keyword
    ? `🔍 搜索结果：找到 ${total} 个匹配的合集\n\n`
    : `📚 可访问的合集列表（共 ${total} 个）\n\n`;

  for (const collection of collections) {
    const fileCount = (collection as any)._count.mediaFiles;
    const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

    message += `📦 ${collection.title}\n`;
    if (collection.description) {
      message += `   📝 ${collection.description}\n`;
    }
    message += `   📁 ${fileCount} 个文件\n`;
    message += `   🔗 ${deepLink}\n`;
    message += `   📅 ${collection.createdAt.toLocaleDateString()}\n`;
    if (isAdmin) {
      message += `   🆔 ID: ${collection.id}\n`;
    }
    message += `\n`;
  }

  message += `\n📄 第 ${page}/${totalPages} 页`;

  // 构建翻页键盘
  const keyboard = new InlineKeyboard();

  if (page > 1) {
    keyboard.text('⬅️ 上一页', `page:${keyword || ''}:${page - 1}`);
  }

  if (page < totalPages) {
    keyboard.text('➡️ 下一页', `page:${keyword || ''}:${page + 1}`);
  }

  // 如果是管理员，为每个合集添加编辑和删除按钮
  if (isAdmin && collections.length > 0) {
    keyboard.row();
    for (const collection of collections) {
      keyboard.text(`✏️ ${collection.title.substring(0, 10)}`, `edit_collection:${collection.id}`);
      keyboard.text(`🗑️`, `delete_collection:${collection.id}`);
      keyboard.row();
    }
  }

  return { message, keyboard };
}

// 处理翻页回调
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // 处理命令按钮
  if (data.startsWith('cmd:')) {
    const command = data.split(':')[1];

    // 检查是否为管理员
    const userId = ctx.from?.id;
    const isAdmin = !!(userId && isUserAdmin(userId));

    switch (command) {
      case 'list':
        // 显示合集列表
        const { collections, total, page, totalPages } = await collectionService.getCollections(1, 10);

        if (collections.length === 0) {
          await ctx.answerCallbackQuery({ text: '📭 暂无可访问的合集' });
          return;
        }

        const { message, keyboard } = buildCollectionListMessage(collections, total, page, totalPages, undefined, isAdmin);

        await ctx.reply(message, {
          reply_markup: keyboard,
        });

        await ctx.answerCallbackQuery();
        break;

      case 'upload':
        if (!isAdmin) {
          await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
          return;
        }
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter('uploadFlow');
        break;

      case 'publish':
        if (!isAdmin) {
          await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
          return;
        }
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter('publishFlow');
        break;

      case 'setwelcome':
        if (!isAdmin) {
          await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
          return;
        }
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter('setWelcomeFlow');
        break;

      case 'transfer':
        if (!isAdmin) {
          await ctx.answerCallbackQuery({ text: '❌ 仅管理员可用' });
          return;
        }
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter('transferFlow');
        break;

      default:
        await ctx.answerCallbackQuery({ text: '❌ 未知命令' });
    }
    return;
  }

  // 处理翻页
  if (data.startsWith('page:')) {
    // 解析回调数据：page:keyword:pageNumber
    const parts = data.split(':');
    const keyword = parts[1] || '';
    const page = parseInt(parts[2]);

    try {
      const filters = keyword ? { title: keyword } : undefined;
      const { collections, total, page: currentPage, totalPages } = await collectionService.getCollections(page, 10, filters);

      if (collections.length === 0) {
        await ctx.answerCallbackQuery({ text: '没有更多结果了' });
        return;
      }

      // 检查是否为管理员
      const userId = ctx.from?.id;
      const isAdmin = !!(userId && isUserAdmin(userId));

      const { message, keyboard } = buildCollectionListMessage(collections, total, currentPage, totalPages, keyword || undefined, isAdmin);

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
      });

      await ctx.answerCallbackQuery();
    } catch (error) {
      logger.error('Failed to handle pagination', error);
      await ctx.answerCallbackQuery({ text: '❌ 翻页失败，请重试' });
    }
    return;
  }

  // 处理删除确认
  if (data.startsWith('confirm_delete:')) {
    const collectionId = parseInt(data.split(':')[1]);

    try {
      const collection = await collectionService.getCollectionById(collectionId);

      if (!collection) {
        await ctx.answerCallbackQuery({ text: '❌ 合集不存在' });
        return;
      }

      await collectionService.deleteCollection(collectionId);

      await ctx.editMessageText(
        `✅ 合集已删除\n\n` +
        `📦 标题：${collection.title}\n` +
        `📁 文件数量：${collection.mediaFiles.length}`
      );

      await ctx.answerCallbackQuery({ text: '✅ 删除成功' });
      logger.info(`Collection ${collectionId} deleted`);
    } catch (error) {
      logger.error('Failed to delete collection', error);
      await ctx.answerCallbackQuery({ text: '❌ 删除失败，请重试' });
    }
    return;
  }

  // 处理取消删除
  if (data.startsWith('cancel_delete:')) {
    await ctx.editMessageText('❌ 已取消删除');
    await ctx.answerCallbackQuery({ text: '已取消' });
    return;
  }

  // 处理编辑按钮
  if (data.startsWith('edit_collection:')) {
    const collectionId = parseInt(data.split(':')[1]);

    // 检查合集是否存在
    const collection = await collectionService.getCollectionById(collectionId);

    if (!collection) {
      await ctx.answerCallbackQuery({ text: '❌ 合集不存在' });
      return;
    }

    // 显示合集信息和文件列表
    await showEditCollectionUI(ctx, collection, collectionId);
    await ctx.answerCallbackQuery();
    return;
  }

  // 处理编辑标题/描述按钮
  if (data.startsWith('edit_meta:')) {
    const collectionId = parseInt(data.split(':')[1]);

    // 将合集 ID 保存到 session
    (ctx as any).session.editCollectionId = collectionId;

    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('editCollectionFlow');
    return;
  }

  // 处理删除媒体文件按钮
  if (data.startsWith('delete_media:')) {
    const mediaId = parseInt(data.split(':')[1]);

    try {
      const media = await mediaService.getMediaFile(mediaId);

      if (!media) {
        await ctx.answerCallbackQuery({ text: '❌ 文件不存在' });
        return;
      }

      // 请求确认
      const keyboard = new InlineKeyboard()
        .text('✅ 确认删除', `confirm_delete_media:${mediaId}`)
        .text('❌ 取消', `cancel_delete_media:${media.collectionId}`);

      const fileTypeEmoji = getFileTypeEmoji(media.fileType);

      const confirmMessage =
        `⚠️ 确认删除此文件？\n\n` +
        `${fileTypeEmoji} 类型：${media.fileType}\n` +
        `📦 所属合集：${media.collection.title}\n` +
        `🆔 文件 ID：${mediaId}\n\n` +
        `此操作不可撤销！`;

      // 根据文件类型发送预览
      if (media.fileType === 'photo') {
        await ctx.replyWithPhoto(media.fileId, {
          caption: confirmMessage,
          reply_markup: keyboard,
        });
      } else if (media.fileType === 'video') {
        await ctx.replyWithVideo(media.fileId, {
          caption: confirmMessage,
          reply_markup: keyboard,
        });
      } else if (media.fileType === 'audio') {
        await ctx.replyWithAudio(media.fileId, {
          caption: confirmMessage,
          reply_markup: keyboard,
        });
      } else if (media.fileType === 'document') {
        await ctx.replyWithDocument(media.fileId, {
          caption: confirmMessage,
          reply_markup: keyboard,
        });
      } else {
        // 其他类型，只发送文本
        await ctx.reply(confirmMessage, { reply_markup: keyboard });
      }

      await ctx.answerCallbackQuery();
    } catch (error) {
      logger.error('Failed to handle delete media button', error);
      await ctx.answerCallbackQuery({ text: '❌ 操作失败' });
    }
    return;
  }

  // 处理确认删除媒体文件
  if (data.startsWith('confirm_delete_media:')) {
    const mediaId = parseInt(data.split(':')[1]);

    try {
      const media = await mediaService.getMediaFile(mediaId);

      if (!media) {
        await ctx.answerCallbackQuery({ text: '❌ 文件不存在' });
        return;
      }

      const collectionId = media.collectionId;
      await mediaService.deleteMediaFile(mediaId);

      await ctx.editMessageText(
        `✅ 文件已删除\n\n` +
        `类型：${media.fileType}\n` +
        `所属合集：${media.collection.title}`
      );

      await ctx.answerCallbackQuery({ text: '✅ 删除成功' });
      logger.info(`Media file ${mediaId} deleted from collection ${collectionId}`);
    } catch (error) {
      logger.error('Failed to delete media file', error);
      await ctx.answerCallbackQuery({ text: '❌ 删除失败，请重试' });
    }
    return;
  }

  // 处理取消删除媒体文件
  if (data.startsWith('cancel_delete_media:')) {
    await ctx.editMessageText('❌ 已取消删除');
    await ctx.answerCallbackQuery({ text: '已取消' });
    return;
  }

  // 处理删除按钮
  if (data.startsWith('delete_collection:')) {
    const collectionId = parseInt(data.split(':')[1]);

    try {
      const collection = await collectionService.getCollectionById(collectionId);

      if (!collection) {
        await ctx.answerCallbackQuery({ text: '❌ 合集不存在' });
        return;
      }

      // 请求确认
      const keyboard = new InlineKeyboard()
        .text('✅ 确认删除', `confirm_delete:${collectionId}`)
        .text('❌ 取消', `cancel_delete:${collectionId}`);

      await ctx.reply(
        buildDeleteConfirmMessage(collection),
        { reply_markup: keyboard }
      );

      await ctx.answerCallbackQuery();
    } catch (error) {
      logger.error('Failed to handle delete button', error);
      await ctx.answerCallbackQuery({ text: '❌ 操作失败' });
    }
    return;
  }
});

// 错误处理
bot.catch((err) => {
  logger.error('Bot error occurred', err);
});

// 设置 Bot 命令菜单
async function setupCommands() {
  try {
    // 所有用户（包括管理员）只显示 start 命令
    await bot.api.setMyCommands([
      { command: 'start', description: '开始使用或访问合集' }
    ]);

    logger.info('Bot commands menu set successfully');
  } catch (error) {
    logger.error('Failed to set bot commands', error);
  }
}

// 启动 Bot
async function start() {
  logger.info('Starting bot...');
  logger.info(`Bot token: ${process.env.BOT_TOKEN?.substring(0, 10)}...`);
  logger.info(`Admin IDs: ${process.env.ADMIN_IDS}`);

  try {
    // 获取 bot 信息（带超时）
    logger.info('Fetching bot info from Telegram API...');
    const me = await Promise.race([
      bot.api.getMe(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Cannot connect to Telegram API after 10s')), 10000)
      )
    ]) as any;

    logger.info(`Bot info: @${me.username} (${me.first_name})`);

    // 设置命令菜单
    await setupCommands();

    // 启动 long polling
    logger.info('Starting long polling...');
    await bot.start({
      onStart: (botInfo) => {
        logger.info(`Bot started successfully: @${botInfo.username}`);
      },
    });
  } catch (error: any) {
    logger.error('Failed to start bot', error);
    if (error.message?.includes('Timeout')) {
      logger.error('Cannot connect to Telegram API. Please check:');
      logger.error('1. Network connection');
      logger.error('2. Proxy settings (if in China)');
      logger.error('3. Bot token validity');
    }
    process.exit(1);
  }
}

// 优雅关闭
process.once('SIGINT', () => {
  logger.info('Received SIGINT, stopping bot...');
  bot.stop();
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping bot...');
  bot.stop();
});

start();
