import prisma from '../database/client';
import { createLogger } from '../utils/logger';
import { executeWithErrorHandling } from '../utils/errorHandler';

const logger = createLogger('MediaService');

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
    return executeWithErrorHandling('MediaService', 'addMediaFile', async () => {
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
    });
  }

  /**
   * 批量添加媒体文件（优化版：使用批量插入）
   */
  async addMediaFiles(files: Array<{
    collectionId: number;
    fileId: string;
    uniqueFileId: string;
    fileType: string;
    order: number;
  }>) {
    return executeWithErrorHandling('MediaService', 'addMediaFiles', async () => {
      if (files.length === 0) {
        return [];
      }

      // 批量检查重复
      const uniqueFileIds = files.map(f => f.uniqueFileId);
      const existingFiles = await prisma.mediaFile.findMany({
        where: {
          uniqueFileId: {
            in: uniqueFileIds,
          },
        },
      });

      const existingFileIdsSet = new Set(existingFiles.map(f => f.uniqueFileId));

      // 过滤出不重复的文件
      const filesToInsert = files.filter(f => !existingFileIdsSet.has(f.uniqueFileId));
      const duplicateCount = files.length - filesToInsert.length;

      if (duplicateCount > 0) {
        logger.warn(`Found ${duplicateCount} duplicate files, skipping`);
      }

      // 批量插入（使用 createMany）
      if (filesToInsert.length > 0) {
        await prisma.mediaFile.createMany({
          data: filesToInsert,
          skipDuplicates: true, // 额外的安全措施
        });

        logger.info(`Batch insert complete: ${filesToInsert.length} files added`);
      }

      // 返回结果
      const results = files.map(file => {
        const isDuplicate = existingFileIdsSet.has(file.uniqueFileId);
        return {
          isDuplicate,
          file: isDuplicate
            ? existingFiles.find(f => f.uniqueFileId === file.uniqueFileId)!
            : file,
        };
      });

      logger.info(`Batch add complete: ${filesToInsert.length} added, ${duplicateCount} duplicates`);

      return results;
    });
  }

  /**
   * 获取合集的所有媒体文件
   */
  async getMediaFilesByCollection(collectionId: number) {
    return executeWithErrorHandling('MediaService', 'getMediaFilesByCollection', async () => {
      const files = await prisma.mediaFile.findMany({
        where: { collectionId },
        orderBy: { order: 'asc' },
      });
      return files;
    });
  }

  /**
   * 检查文件是否已存在
   */
  async checkDuplicate(uniqueFileId: string): Promise<boolean> {
    return executeWithErrorHandling('MediaService', 'checkDuplicate', async () => {
      const existing = await prisma.mediaFile.findUnique({
        where: { uniqueFileId },
      });
      return !!existing;
    });
  }

  /**
   * 批量检查文件是否已存在（优化版）
   */
  async batchCheckDuplicates(uniqueFileIds: string[]): Promise<string[]> {
    return executeWithErrorHandling('MediaService', 'batchCheckDuplicates', async () => {
      if (uniqueFileIds.length === 0) {
        return [];
      }

      const existingFiles = await prisma.mediaFile.findMany({
        where: {
          uniqueFileId: {
            in: uniqueFileIds,
          },
        },
        select: {
          uniqueFileId: true,
        },
      });

      return existingFiles.map(f => f.uniqueFileId);
    });
  }

  /**
   * 删除媒体文件
   */
  async deleteMediaFile(id: number) {
    return executeWithErrorHandling('MediaService', 'deleteMediaFile', async () => {
      const file = await prisma.mediaFile.delete({
        where: { id },
      });
      logger.info(`Media file deleted: ${file.id}`);
      return file;
    });
  }

  /**
   * 获取媒体文件
   */
  async getMediaFile(id: number) {
    return executeWithErrorHandling('MediaService', 'getMediaFile', async () => {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id },
        include: {
          collection: true,
        },
      });
      return mediaFile;
    });
  }
}

export default new MediaService();
