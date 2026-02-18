import prisma from '../database/client';
import Logger from '../utils/logger';

const logger = new Logger('UserService');

/**
 * 用户服务
 */
export class UserService {
  /**
   * 获取或创建用户
   */
  async getOrCreateUser(telegramId: number, userData: {
    firstName?: string;
    lastName?: string;
    username?: string;
  }) {
    try {
      let user = await prisma.user.findUnique({
        where: { telegramId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
          },
        });
        logger.info(`User created: id=${user.id}, telegramId=${user.telegramId}`);
      }

      return user;
    } catch (error) {
      logger.error(`Error in getOrCreateUser: ${error}`, error);
      throw error;
    }
  }

  /**
   * 检查用户是否为管理员
   */
  async isAdmin(telegramId: number): Promise<boolean> {
    try {
      const adminIds = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
      return adminIds.includes(telegramId);
    } catch (error) {
      logger.error(`Error in isAdmin: ${error}`, error);
      throw error;
    }
  }

  /**
   * 获取所有激活的用户
   */
  async getActiveUsers() {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
      });
      return users;
    } catch (error) {
      logger.error(`Error in getActiveUsers: ${error}`, error);
      throw error;
    }
  }

  /**
   * 标记用户为非激活状态
   */
  async deactivateUser(telegramId: number) {
    try {
      const user = await prisma.user.update({
        where: { telegramId },
        data: { isActive: false },
      });
      logger.info(`User deactivated: ${user.telegramId}`);
      return user;
    } catch (error) {
      logger.error(`Error in deactivateUser: ${error}`, error);
      throw error;
    }
  }
}

export default new UserService();
