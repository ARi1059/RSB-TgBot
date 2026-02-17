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
    logger.info(`addMediaFile called with data: ${JSON.stringify(data)}`);

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

      logger.info(`Media file created: ${JSON.stringify(file)}`);
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
    logger.info(`addMediaFiles called with ${files.length} files`);

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
    logger.info(`getMediaFilesByCollection called with collectionId: ${collectionId}`);

    try {
      const files = await prisma.mediaFile.findMany({
        where: { collectionId },
        orderBy: { order: 'asc' },
      });
      logger.info(`Found ${files.length} media files`);
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
    logger.info(`checkDuplicate called with uniqueFileId: ${uniqueFileId}`);

    try {
      const existing = await prisma.mediaFile.findUnique({
        where: { uniqueFileId },
      });
      const result = !!existing;
      logger.info(`Duplicate check result: ${result}`);
      return result;
    } catch (error) {
      logger.error(`Error in checkDuplicate: ${error}`, error);
      throw error;
    }
  }

  /**
   * 删除媒体文件
   */
  async deleteMediaFile(id: number) {
    logger.info(`deleteMediaFile called with id: ${id}`);

    try {
      const file = await prisma.mediaFile.delete({
        where: { id },
      });
      logger.info(`Media file deleted: ${JSON.stringify(file)}`);
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
    logger.info(`getMediaFile called with id: ${id}`);

    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id },
        include: {
          collection: true,
        },
      });
      logger.info(`Media file found: ${mediaFile ? mediaFile.fileType : 'not found'}`);
      return mediaFile;
    } catch (error) {
      logger.error(`Error in getMediaFile: ${error}`, error);
      throw error;
    }
  }
}

export default new MediaService();
