import { Bot } from 'grammy';
import { createLogger } from '../../utils/logger';
import { MyContext } from '../middlewares/session';

const logger = createLogger('TransferCommand');

/**
 * 注册搬运相关命令
 */
export function registerTransferCommand(bot: Bot<MyContext>): void {
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
}
