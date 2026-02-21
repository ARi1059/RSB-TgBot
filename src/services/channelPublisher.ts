import { Context } from 'grammy';
import { InputMediaPhoto, InputMediaVideo } from 'grammy/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ChannelPublisher');

interface MediaFile {
  fileId: string;
  fileType: string;
  permissionLevel?: number; // 添加权限字段
}

interface PublishOptions {
  title: string;
  description?: string;
  deepLink: string;
  mediaFiles: MediaFile[];
  customCaption?: string; // 自定义文本
}

// 公开频道功能已移除

/**
 * 发布到私密频道（全量发送）
 */
export async function publishToPrivateChannel(ctx: Context, options: PublishOptions): Promise<void> {
  const privateChannelId = process.env.PRIVATE_CHANNEL_ID;

  if (!privateChannelId) {
    logger.warn('PRIVATE_CHANNEL_ID not configured, skipping private channel publish');
    return;
  }

  try {
    const { customCaption, mediaFiles } = options;

    // 过滤出图片和视频
    const mediaToSend = mediaFiles.filter(m => m.fileType === 'photo' || m.fileType === 'video');

    if (mediaToSend.length === 0) {
      logger.warn('No media to publish to private channel');
      return;
    }

    // 使用自定义文本（如果提供）
    const caption = customCaption || '';

    // 分批发送（每次最多10个）
    const batchSize = 10;
    for (let i = 0; i < mediaToSend.length; i += batchSize) {
      const batch = mediaToSend.slice(i, i + batchSize);

      // 构建媒体组
      const mediaGroup: (InputMediaPhoto | InputMediaVideo)[] = batch.map((media, index) => {
        if (media.fileType === 'photo') {
          return {
            type: 'photo' as const,
            media: media.fileId,
            caption: i === 0 && index === 0 ? caption : undefined,
          };
        } else {
          return {
            type: 'video' as const,
            media: media.fileId,
            caption: i === 0 && index === 0 ? caption : undefined,
          };
        }
      });

      // 发送到私密频道
      await ctx.api.sendMediaGroup(privateChannelId, mediaGroup);

      // 避免限流
      if (i + batchSize < mediaToSend.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Published to private channel with custom caption, ${mediaToSend.length} files`);
  } catch (error) {
    logger.error('Failed to publish to private channel', error);
  }
}

// 公开频道功能已移除
