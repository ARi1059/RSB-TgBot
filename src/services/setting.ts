import prisma from '../database/client';
import Logger from '../utils/logger';

const logger = new Logger('SettingService');

/**
 * 设置服务
 */
export class SettingService {
  /**
   * 获取设置值
   */
  async get(key: string): Promise<string | null> {
    logger.info(`get called with key: ${key}`);

    try {
      const setting = await prisma.setting.findUnique({
        where: { key },
      });
      const value = setting?.value || null;
      logger.info(`Setting value: ${value}`);
      return value;
    } catch (error) {
      logger.error(`Error in get: ${error}`, error);
      throw error;
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: string) {
    logger.info(`set called with key: ${key}, value: ${value}`);

    try {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      logger.info(`Setting updated: ${JSON.stringify(setting)}`);
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
    logger.info(`delete called with key: ${key}`);

    try {
      const setting = await prisma.setting.delete({
        where: { key },
      });
      logger.info(`Setting deleted: ${JSON.stringify(setting)}`);
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
    logger.info('getWelcomeMessage called');

    try {
      const message = await this.get('welcome_message');
      const result = message || '欢迎使用 RSB Bot！';
      logger.info(`Welcome message: ${result}`);
      return result;
    } catch (error) {
      logger.error(`Error in getWelcomeMessage: ${error}`, error);
      throw error;
    }
  }

  /**
   * 设置欢迎消息
   */
  async setWelcomeMessage(message: string) {
    logger.info(`setWelcomeMessage called with message: ${message}`);

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
