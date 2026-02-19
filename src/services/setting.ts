import prisma from '../database/client';
import { createLogger } from '../utils/logger';
import { executeWithErrorHandling } from '../utils/errorHandler';

const logger = createLogger('SettingService');

/**
 * 设置服务
 */
export class SettingService {
  /**
   * 获取设置值
   */
  async get(key: string): Promise<string | null> {
    return executeWithErrorHandling('SettingService', 'get', async () => {
      const setting = await prisma.setting.findUnique({
        where: { key },
      });
      return setting?.value || null;
    });
  }

  /**
   * 设置值
   */
  async set(key: string, value: string) {
    return executeWithErrorHandling('SettingService', 'set', async () => {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      return setting;
    });
  }

  /**
   * 删除设置
   */
  async delete(key: string) {
    return executeWithErrorHandling('SettingService', 'delete', async () => {
      const setting = await prisma.setting.delete({
        where: { key },
      });
      return setting;
    });
  }

  /**
   * 获取欢迎消息
   */
  async getWelcomeMessage(): Promise<string> {
    return executeWithErrorHandling('SettingService', 'getWelcomeMessage', async () => {
      const message = await this.get('welcome_message');
      return message || '欢迎使用 RSB Bot！';
    });
  }

  /**
   * 设置欢迎消息
   */
  async setWelcomeMessage(message: string) {
    return executeWithErrorHandling('SettingService', 'setWelcomeMessage', async () => {
      const result = await this.set('welcome_message', message);
      logger.info('Welcome message updated');
      return result;
    });
  }
}

export default new SettingService();
