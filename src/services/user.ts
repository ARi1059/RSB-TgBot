import prisma from '../database/client';
import { executeWithErrorHandling } from '../utils/errorHandler';
import { UserLevel } from '../utils/permissions';
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
    return executeWithErrorHandling('UserService', 'getOrCreateUser', async () => {
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
            userLevel: UserLevel.NORMAL, // 默认为普通用户
          },
        });
        logger.info(`User created: id=${user.id}, telegramId=${user.telegramId}, userLevel=${user.userLevel}`);
      }

      return user;
    });
  }

  /**
   * 获取用户
   */
  async getUser(telegramId: number) {
    return executeWithErrorHandling('UserService', 'getUser', async () => {
      const user = await prisma.user.findUnique({
        where: { telegramId },
      });
      return user;
    });
  }

  /**
   * 更新用户权限等级
   */
  async updateUserLevel(telegramId: number, userLevel: UserLevel) {
    return executeWithErrorHandling('UserService', 'updateUserLevel', async () => {
      const user = await prisma.user.update({
        where: { telegramId },
        data: { userLevel },
      });
      logger.info(`User level updated: telegramId=${telegramId}, userLevel=${userLevel}`);
      return user;
    });
  }

  /**
   * 检查用户是否为管理员
   */
  async isAdmin(telegramId: number): Promise<boolean> {
    return executeWithErrorHandling('UserService', 'isAdmin', async () => {
      const adminIds = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
      return adminIds.includes(telegramId);
    });
  }

  /**
   * 获取所有激活的用户
   */
  async getActiveUsers() {
    return executeWithErrorHandling('UserService', 'getActiveUsers', async () => {
      const users = await prisma.user.findMany({
        where: { isActive: true },
      });
      return users;
    });
  }

  /**
   * 标记用户为非激活状态
   */
  async deactivateUser(telegramId: number) {
    return executeWithErrorHandling('UserService', 'deactivateUser', async () => {
      const user = await prisma.user.update({
        where: { telegramId },
        data: { isActive: false },
      });
      logger.info(`User deactivated: ${user.telegramId}`);
      return user;
    });
  }
}

export default new UserService();
