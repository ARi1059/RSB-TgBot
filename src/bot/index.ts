import { Bot } from 'grammy';
import { config } from 'dotenv';
import { createConversation } from '@grammyjs/conversations';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Logger from '../utils/logger';
import { setupSession } from './middlewares/session';
import { adminOnly } from './middlewares/auth';
import userService from '../services/user';
import settingService from '../services/setting';
import collectionService from '../services/collection';
import { renderTemplate } from '../utils/template';
import { uploadFlow } from './conversations/uploadFlow';
import { publishFlow } from './conversations/publishFlow';
import { setWelcomeFlow } from './conversations/setWelcomeFlow';
import { sendMediaFile, sendMediaGroup } from './handlers/media';

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
const bot = new Bot(process.env.BOT_TOKEN!, botConfig);

// 配置会话
setupSession(bot);

// 注册会话流程
bot.use(createConversation(uploadFlow));
bot.use(createConversation(publishFlow));
bot.use(createConversation(setWelcomeFlow));

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
    // 普通访问 - 显示欢迎消息和合集列表
    const welcomeMessage = await settingService.getWelcomeMessage();
    const renderedMessage = renderTemplate(welcomeMessage, {
      user_first_name: ctx.from?.first_name || '',
      user_last_name: ctx.from?.last_name || '',
      user_username: ctx.from?.username || '',
    });

    await ctx.reply(renderedMessage);

    // 获取所有合集列表
    const { collections, total } = await collectionService.getCollections(1, 20);

    if (collections.length === 0) {
      await ctx.reply('📭 暂无可访问的合集');
    } else {
      let message = `📚 可访问的合集列表（共 ${total} 个）\n\n`;

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

      if (total > 20) {
        message += `\n💡 显示前 20 个合集`;
      }

      await ctx.reply(message);
    }
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
    message += `   📅 ${collection.createdAt.toLocaleDateString()}\n\n`;
  }

  message += `第 ${page}/${totalPages} 页`;

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

// 错误处理
bot.catch((err) => {
  logger.error('Bot error occurred', err);
});

// 设置 Bot 命令菜单
async function setupCommands() {
  try {
    // 设置普通用户的命令
    await bot.api.setMyCommands([
      { command: 'start', description: '开始使用或访问合集' }
    ]);

    // 设置管理员的命令（需要获取管理员 ID 列表）
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];

    for (const adminId of adminIds) {
      await bot.api.setMyCommands(
        [
          { command: 'start', description: '开始使用或访问合集' },
          { command: 'upload', description: '上传媒体文件到合集' },
          { command: 'display', description: '查看所有合集列表' },
          { command: 'publish', description: '发布合集' },
          { command: 'setwelcome', description: '设置欢迎消息' }
        ],
        { scope: { type: 'chat', chat_id: adminId } }
      );
    }

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
