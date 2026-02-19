import prisma from '../database/client';
import { generateToken } from '../utils/token';
import { executeWithErrorHandling } from '../utils/errorHandler';
import { UserLevel, PermissionLevel, getMaxAccessiblePermission } from '../utils/permissions';
import { createLogger } from '../utils/logger';
import { createCache } from '../utils/cache';

const logger = createLogger('CollectionService');

// 创建合集缓存（5分钟 TTL）
const collectionCache = createCache<any>(5 * 60 * 1000);

/**
 * 合集服务
 */
export class CollectionService {
  constructor() {
    // 启动缓存清理
    collectionCache.startCleanup();
  }

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
   * 根据 token 获取合集（带权限过滤和缓存）
   */
  async getCollectionByToken(token: string, userLevel: UserLevel = UserLevel.NORMAL) {
    return executeWithErrorHandling('CollectionService', 'getCollectionByToken', async () => {
      // 尝试从缓存获取
      const cacheKey = `collection:token:${token}:level:${userLevel}`;
      const cached = collectionCache.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for token: ${token}`);
        return cached;
      }

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

      // 存入缓存
      collectionCache.set(cacheKey, collection);

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

      // 清除相关缓存
      this.clearCollectionCache(collection.token);

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

      // 清除相关缓存
      this.clearCollectionCache(collection.token);

      logger.info(`Collection updated: ${collection.id} - ${collection.title}`);
      return collection;
    });
  }

  /**
   * 清除合集相关的所有缓存
   */
  private clearCollectionCache(token: string): void {
    // 清除所有权限等级的缓存
    for (let level = 0; level <= 2; level++) {
      const cacheKey = `collection:token:${token}:level:${level}`;
      collectionCache.delete(cacheKey);
    }
    logger.debug(`Cache cleared for collection token: ${token}`);
  }
}

export default new CollectionService();
