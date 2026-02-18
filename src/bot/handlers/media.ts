import { Context } from 'grammy';
import Logger from '../../utils/logger';

const logger = new Logger('MediaHandler');

/**
 * 媒体文件处理器
 * 用于处理用户发送的媒体文件
 */

export interface MediaInfo {
  fileId: string;
  uniqueFileId: string;
  fileType: 'photo' | 'video' | 'document' | 'audio';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  mediaGroupId?: string;
}

/**
 * 从消息中提取媒体信息
 */
export function extractMediaInfo(ctx: Context): MediaInfo | null {
  const message = ctx.message;

  if (!message) {
    return null;
  }

  // 处理图片
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1]; // 获取最大尺寸
    return {
      fileId: photo.file_id,
      uniqueFileId: photo.file_unique_id,
      fileType: 'photo',
      fileSize: photo.file_size,
      mediaGroupId: message.media_group_id,
    };
  }

  // 处理视频
  if (message.video) {
    return {
      fileId: message.video.file_id,
      uniqueFileId: message.video.file_unique_id,
      fileType: 'video',
      fileName: message.video.file_name,
      fileSize: message.video.file_size,
      mimeType: message.video.mime_type,
      mediaGroupId: message.media_group_id,
    };
  }

  // 处理文档
  if (message.document) {
    return {
      fileId: message.document.file_id,
      uniqueFileId: message.document.file_unique_id,
      fileType: 'document',
      fileName: message.document.file_name,
      fileSize: message.document.file_size,
      mimeType: message.document.mime_type,
    };
  }

  // 处理音频
  if (message.audio) {
    return {
      fileId: message.audio.file_id,
      uniqueFileId: message.audio.file_unique_id,
      fileType: 'audio',
      fileName: message.audio.file_name,
      fileSize: message.audio.file_size,
      mimeType: message.audio.mime_type,
    };
  }

  return null;
}

/**
 * 发送媒体文件
 */
export async function sendMediaFile(ctx: Context, fileId: string, fileType: string) {
  try {
    switch (fileType) {
      case 'photo':
        await ctx.replyWithPhoto(fileId);
        break;
      case 'video':
        await ctx.replyWithVideo(fileId);
        break;
      case 'document':
        await ctx.replyWithDocument(fileId);
        break;
      case 'audio':
        await ctx.replyWithAudio(fileId);
        break;
      default:
        logger.warn(`Unknown file type: ${fileType}`);
    }
  } catch (error) {
    logger.error(`Failed to send media file: ${fileId}`, error);
    throw error;
  }
}

/**
 * 以媒体组形式发送媒体文件
 * Telegram 限制每个媒体组最多 10 个文件
 * 添加速率限制以避免触发 429 Too Many Requests 错误
 */
export async function sendMediaGroup(ctx: Context, mediaFiles: Array<{ fileId: string; fileType: string }>) {
  const MEDIA_GROUP_LIMIT = 10;
  const DELAY_BETWEEN_GROUPS = 1000; // 每组之间延迟 1 秒
  const DELAY_BETWEEN_INDIVIDUAL_FILES = 100; // 单个文件之间延迟 100 毫秒
  const MAX_RETRIES = 3; // 最大重试次数

  // 将文件分组，每组最多 10 个
  for (let i = 0; i < mediaFiles.length; i += MEDIA_GROUP_LIMIT) {
    const group = mediaFiles.slice(i, i + MEDIA_GROUP_LIMIT);

    // 构建媒体组数组
    const mediaGroup: any[] = [];

    for (const media of group) {
      let mediaItem: any;

      switch (media.fileType) {
        case 'photo':
          mediaItem = { type: 'photo', media: media.fileId };
          break;
        case 'video':
          mediaItem = { type: 'video', media: media.fileId };
          break;
        case 'document':
          mediaItem = { type: 'document', media: media.fileId };
          break;
        case 'audio':
          mediaItem = { type: 'audio', media: media.fileId };
          break;
        default:
          logger.warn(`Unknown file type: ${media.fileType}, skipping`);
          continue;
      }

      mediaGroup.push(mediaItem);
    }

    // 发送媒体组
    if (mediaGroup.length > 0) {
      let retryCount = 0;
      let success = false;

      while (retryCount < MAX_RETRIES && !success) {
        try {
          await ctx.replyWithMediaGroup(mediaGroup);
          logger.info(`Sent media group with ${mediaGroup.length} files (group ${Math.floor(i / MEDIA_GROUP_LIMIT) + 1})`);
          success = true;
        } catch (error: any) {
          // 检查是否是速率限制错误
          if (error.error_code === 429) {
            const retryAfter = error.parameters?.retry_after || 5;
            logger.warn(`Rate limit hit, waiting ${retryAfter} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            retryCount++;
          } else {
            logger.error(`Failed to send media group`, error);
            // 如果不是速率限制错误，尝试逐个发送
            logger.info('Falling back to sending files individually');
            for (let j = 0; j < group.length; j++) {
              const media = group[j];
              try {
                await sendMediaFile(ctx, media.fileId, media.fileType);
                // 单个文件之间也添加延迟
                if (j < group.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_INDIVIDUAL_FILES));
                }
              } catch (err) {
                logger.error(`Failed to send individual file: ${media.fileId}`, err);
              }
            }
            success = true; // 标记为成功以跳出重试循环
          }
        }
      }

      // 如果不是最后一组，添加延迟
      if (i + MEDIA_GROUP_LIMIT < mediaFiles.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_GROUPS));
      }
    }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
