import { Bot } from 'grammy';
import { createLogger } from '../../utils/logger';
import { MyContext } from '../middlewares/session';

const logger = createLogger('Commands');

/**
 * 设置 Bot 命令菜单
 */
export async function setupCommands(bot: Bot<MyContext>): Promise<void> {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: '开始使用' },
      { command: 'upload', description: '上传合集（管理员）' },
      { command: 'display', description: '展示合集（管理员）' },
      { command: 'edit', description: '编辑合集（管理员）' },
      { command: 'delete', description: '删除合集（管理员）' },
      { command: 'transfer', description: '搬运合集（管理员）' },
    ]);
    logger.info('Bot commands set successfully');
  } catch (error) {
    logger.error('Failed to set bot commands', error);
  }
}
