import prisma from '../database/client';
import Logger from '../utils/logger';

const logger = new Logger('MediaService');

/**
 * 媒体文件服务
 */
export class MediaService {
  /**
   * 添加媒体文件到合集
   */
  async addMediaFile(data: {
    collectionId: number;
    fileId: string;
    uniqueFileId: string;
    fileType: string;
    order: number;
  }) {
    try {
      // 检查是否已存在（去重）
      const existing = await prisma.mediaFile.findUnique({
        where: { uniqueFileId: data.uniqueFileId },
      });

      if (existing) {
        logger.warn(`Duplicate file found: ${data.uniqueFileId}`);
        return { isDuplicate: true, file: existing };
      }

      const file = await prisma.mediaFile.create({
        data,
      });

      return { isDuplicate: false, file };
    } catch (error) {
      logger.error(`Error in addMediaFile: ${error}`, error);
      throw error;
    }
  }

  /**
   * 批量添加媒体文件
   */
  async addMediaFiles(files: Array<{
    collectionId: number;
    fileId: string;
    uniqueFileId: string;
    fileType: string;
    order: number;
  }>) {
    try {
      const results = [];

      for (const file of files) {
        const result = await this.addMediaFile(file);
        results.push(result);
      }

      const added = results.filter(r => !r.isDuplicate).length;
      const duplicates = results.filter(r => r.isDuplicate).length;
      logger.info(`Batch add complete: ${added} added, ${duplicates} duplicates`);

      return results;
    } catch (error) {
      logger.error(`Error in addMediaFiles: ${error}`, error);
      throw error;
    }
  }

  /**
   * 获取合集的所有媒体文件
   */
  async getMediaFilesByCollection(collectionId: number) {
    try {
      const files = await prisma.mediaFile.findMany({
        where: { collectionId },
        orderBy: { order: 'asc' },
      });
      return files;
    } catch (error) {
      logger.error(`Error in getMediaFilesByCollection: ${error}`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否已存在
   */
  async checkDuplicate(uniqueFileId: string): Promise<boolean> {
    try {
      const existing = await prisma.mediaFile.findUnique({
        where: { uniqueFileId },
      });
      return !!existing;
    } catch (error) {
      logger.error(`Error in checkDuplicate: ${error}`, error);
      throw error;
    }
  }

  /**
   * 删除媒体文件
   */
  async deleteMediaFile(id: number) {
    try {
      const file = await prisma.mediaFile.delete({
        where: { id },
      });
      logger.info(`Media file deleted: ${file.id}`);
      return file;
    } catch (error) {
      logger.error(`Error in deleteMediaFile: ${error}`, error);
      throw error;
    }
  }

  /**
   * 获取媒体文件
   */
  async getMediaFile(id: number) {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id },
        include: {
          collection: true,
        },
      });
      return mediaFile;
    } catch (error) {
      logger.error(`Error in getMediaFile: ${error}`, error);
      throw error;
    }
  }
}

export default new MediaService();
