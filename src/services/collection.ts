import prisma from '../database/client';
import { generateToken } from '../utils/token';
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
  }) {
    logger.info(`createCollection called with data: ${JSON.stringify(data)}`);

    try {
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
        },
      });

      logger.info(`Collection created: ${JSON.stringify(collection)}`);
      return collection;
    } catch (error) {
      logger.error(`Error in createCollection: ${error}`, error);
      throw error;
    }
  }

  /**
   * 根据 token 获取合集
   */
  async getCollectionByToken(token: string) {
    logger.info(`getCollectionByToken called with token: ${token}`);

    try {
      const collection = await prisma.collection.findUnique({
        where: { token },
        include: {
          mediaFiles: {
            orderBy: { order: 'asc' },
          },
          creator: true,
        },
      });

      if (collection) {
        logger.info(`Collection found: ${collection.title} with ${collection.mediaFiles.length} files`);
      } else {
        logger.warn(`Collection not found for token: ${token}`);
      }

      return collection;
    } catch (error) {
      logger.error(`Error in getCollectionByToken: ${error}`, error);
      throw error;
    }
  }

  /**
   * 获取所有合集（分页）
   */
  async getCollections(page: number = 1, limit: number = 10, filters?: {
    title?: string;
    creatorId?: number;
  }) {
    logger.info(`getCollections called with page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filters)}`);

    try {
      const skip = (page - 1) * limit;

      const where: any = {};
      if (filters?.title) {
        where.title = { contains: filters.title, mode: 'insensitive' };
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

      logger.info(`Found ${collections.length} collections (total: ${total})`);

      return {
        collections,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Error in getCollections: ${error}`, error);
      throw error;
    }
  }

  /**
   * 删除合集
   */
  async deleteCollection(id: number) {
    logger.info(`deleteCollection called with id: ${id}`);

    try {
      const collection = await prisma.collection.delete({
        where: { id },
      });
      logger.info(`Collection deleted: ${JSON.stringify(collection)}`);
      return collection;
    } catch (error) {
      logger.error(`Error in deleteCollection: ${error}`, error);
      throw error;
    }
  }
}

export default new CollectionService();
