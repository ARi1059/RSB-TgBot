import { createLogger } from '../utils/logger';
import prisma from '../database/client';
import collectionService from '../services/collection';
import { createBot } from './setup/bot';
import { setupCommands } from './setup/commands';
import { registerStartCommand } from './commands/start';
import { registerAdminCommands } from './commands/admin';
import { registerTransferCommand } from './commands/transfer';
import { registerCallbackHandlers } from './handlers/callbacks';

const logger = createLogger('BotMain');

/**
 * 启动 Bot
 */
async function start() {
  try {
    // 创建 Bot 实例
    const { bot, deduplicationMiddleware } = createBot();

    // 注册命令
    registerStartCommand(bot);
    registerAdminCommands(bot);
    registerTransferCommand(bot);

    // 注册回调处理器
    registerCallbackHandlers(bot);

    // 设置命令菜单
    await setupCommands(bot);

    // 优雅关闭处理
    process.once('SIGINT', async () => {
      logger.info('Received SIGINT, stopping bot...');

      // 停止定时器清理
      logger.info('Stopping cleanup timers...');
      deduplicationMiddleware.stopCleanup();
      collectionService.stopCleanup();

      // 停止 bot
      bot.stop();

      // 关闭数据库连接
      try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection', error);
      }

      logger.info('Graceful shutdown completed');
    });

    process.once('SIGTERM', async () => {
      logger.info('Received SIGTERM, stopping bot...');

      // 停止定时器清理
      logger.info('Stopping cleanup timers...');
      deduplicationMiddleware.stopCleanup();
      collectionService.stopCleanup();

      // 停止 bot
      bot.stop();

      // 关闭数据库连接
      try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection', error);
      }

      logger.info('Graceful shutdown completed');
    });

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

start();
