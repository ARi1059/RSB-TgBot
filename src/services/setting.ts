import prisma from '../database/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('SettingService');

/**
 * 设置服务
 */
export class SettingService {
  /**
   * 获取设置值
   */
  async get(key: string): Promise<string | null> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key },
      });
      return setting?.value || null;
    } catch (error) {
      logger.error(`Error in get: ${error}`, error);
      throw error;
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: string) {
    try {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      return setting;
    } catch (error) {
      logger.error(`Error in set: ${error}`, error);
      throw error;
    }
  }

  /**
   * 删除设置
   */
  async delete(key: string) {
    try {
      const setting = await prisma.setting.delete({
        where: { key },
      });
      return setting;
    } catch (error) {
      logger.error(`Error in delete: ${error}`, error);
      throw error;
    }
  }

  /**
   * 获取欢迎消息
   */
  async getWelcomeMessage(): Promise<string> {
    try {
      const message = await this.get('welcome_message');
      return message || '欢迎使用 RSB Bot！';
    } catch (error) {
      logger.error(`Error in getWelcomeMessage: ${error}`, error);
      throw error;
    }
  }

  /**
   * 设置欢迎消息
   */
  async setWelcomeMessage(message: string) {
    try {
      const result = await this.set('welcome_message', message);
      logger.info('Welcome message updated');
      return result;
    } catch (error) {
      logger.error(`Error in setWelcomeMessage: ${error}`, error);
      throw error;
    }
  }
}

export default new SettingService();
