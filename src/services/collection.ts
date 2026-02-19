import prisma from '../database/client';
import { generateToken } from '../utils/token';
import { executeWithErrorHandling } from '../utils/errorHandler';
import { UserLevel, PermissionLevel, getMaxAccessiblePermission } from '../utils/permissions';
import Logger from '../utils/logger';

const logger = new Logger('CollectionService');

/**
 * 合集服务
 */
export class CollectionService {
  /**
   * 创建新合集
   */
  async createCollection(data: {
    title: string;
    description?: string;
    creatorId: number;
    permissionLevel?: PermissionLevel;
  }) {
    return executeWithErrorHandling('CollectionService', 'createCollection', async () => {
      // 生成唯一 token
      let token = generateToken();
      let exists = await prisma.collection.findUnique({ where: { token } });

      // 如果 token 冲突，重新生成
      while (exists) {
        logger.warn(`Token collision detected: ${token}, regenerating...`);
        token = generateToken();
        exists = await prisma.collection.findUnique({ where: { token } });
      }

      const collection = await prisma.collection.create({
        data: {
          ...data,
          token,
          permissionLevel: data.permissionLevel ?? PermissionLevel.NORMAL,
        },
      });

      logger.info(`Collection created: ${collection.id} - ${collection.title}`);
      return collection;
    });
  }

  /**
   * 根据 token 获取合集（带权限过滤）
   */
  async getCollectionByToken(token: string, userLevel: UserLevel = UserLevel.NORMAL) {
    return executeWithErrorHandling('CollectionService', 'getCollectionByToken', async () => {
      const collection = await prisma.collection.findUnique({
        where: { token },
        include: {
          mediaFiles: {
            orderBy: { order: 'asc' },
          },
          creator: true,
        },
      });

      if (!collection) {
        logger.warn(`Collection not found for token: ${token}`);
        return null;
      }

      // 检查合集权限
      if (collection.permissionLevel > userLevel) {
        logger.warn(`User level ${userLevel} insufficient for collection ${collection.id} (requires ${collection.permissionLevel})`);
        return null;
      }

      // 过滤文件权限
      const maxPermission = getMaxAccessiblePermission(userLevel);
      collection.mediaFiles = collection.mediaFiles.filter(
        file => file.permissionLevel <= maxPermission
      );

      return collection;
    });
  }

  /**
   * 根据 ID 获取合集（带权限过滤）
   */
  async getCollectionById(id: number, userLevel: UserLevel = UserLevel.NORMAL) {
    return executeWithErrorHandling('CollectionService', 'getCollectionById', async () => {
      const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
          mediaFiles: {
            orderBy: { order: 'asc' },
          },
          creator: true,
        },
      });

      if (!collection) {
        logger.warn(`Collection not found for id: ${id}`);
        return null;
      }

      // 检查合集权限
      if (collection.permissionLevel > userLevel) {
        logger.warn(`User level ${userLevel} insufficient for collection ${collection.id} (requires ${collection.permissionLevel})`);
        return null;
      }

      // 过滤文件权限
      const maxPermission = getMaxAccessiblePermission(userLevel);
      collection.mediaFiles = collection.mediaFiles.filter(
        file => file.permissionLevel <= maxPermission
      );

      return collection;
    });
  }

  /**
   * 根据标题获取合集
   */
  async getCollectionByTitle(title: string, creatorId: number) {
    return executeWithErrorHandling('CollectionService', 'getCollectionByTitle', async () => {
      const collection = await prisma.collection.findFirst({
        where: {
          title,
          creatorId,
        },
        include: {
          mediaFiles: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return collection;
    });
  }

  /**
   * 获取所有合集（分页，不过滤权限）
   */
  async getCollections(page: number = 1, limit: number = 10, filters?: {
    title?: string;
    creatorId?: number;
  }) {
    return executeWithErrorHandling('CollectionService', 'getCollections', async () => {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters?.title) {
        where.OR = [
          { title: { contains: filters.title, mode: 'insensitive' } },
          { description: { contains: filters.title, mode: 'insensitive' } },
        ];
      }
      if (filters?.creatorId) {
        where.creatorId = filters.creatorId;
      }

      const [collections, total] = await Promise.all([
        prisma.collection.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { mediaFiles: true },
            },
            creator: true,
          },
        }),
        prisma.collection.count({ where }),
      ]);

      return {
        collections,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  /**
   * 删除合集
   */
  async deleteCollection(id: number) {
    return executeWithErrorHandling('CollectionService', 'deleteCollection', async () => {
      const collection = await prisma.collection.delete({
        where: { id },
      });
      logger.info(`Collection deleted: ${collection.id} - ${collection.title}`);
      return collection;
    });
  }

  /**
   * 更新合集
   */
  async updateCollection(id: number, data: {
    title?: string;
    description?: string;
    permissionLevel?: PermissionLevel;
  }) {
    return executeWithErrorHandling('CollectionService', 'updateCollection', async () => {
      const collection = await prisma.collection.update({
        where: { id },
        data,
      });
      logger.info(`Collection updated: ${collection.id} - ${collection.title}`);
      return collection;
    });
  }
}

export default new CollectionService();
