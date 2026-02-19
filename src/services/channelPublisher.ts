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

/**
 * 发布到公开频道（随机选择媒体）
 */
export async function publishToPublicChannel(ctx: Context, options: PublishOptions): Promise<void> {
  const publicChannelId = process.env.PUBLIC_CHANNEL_ID;

  if (!publicChannelId) {
    logger.warn('PUBLIC_CHANNEL_ID not configured, skipping public channel publish');
    return;
  }

  try {
    const { customCaption, mediaFiles } = options;

    // 只选择权限为0的文件
    const freeMediaFiles = mediaFiles.filter(m => (m.permissionLevel ?? 0) === 0);

    if (freeMediaFiles.length === 0) {
      logger.warn('No free media files (permission level 0) to publish to public channel');
      return;
    }

    // 分类媒体文件
    const photos = freeMediaFiles.filter(m => m.fileType === 'photo');
    const videos = freeMediaFiles.filter(m => m.fileType === 'video');

    // 选择要发送的媒体
    const selectedMedia: MediaFile[] = [];

    // 如果只有1个可选文件，直接发送该文件
    if (freeMediaFiles.length === 1) {
      selectedMedia.push(freeMediaFiles[0]);
      logger.info('Only 1 free media file, sending it directly');
    } else {
      // 如果可选文件数>=2，按照现有规则选择
      if (photos.length > 0 && videos.length === 0) {
        // 只有图片，随机选择2个
        const shuffled = photos.sort(() => 0.5 - Math.random());
        selectedMedia.push(...shuffled.slice(0, Math.min(2, photos.length)));
      } else if (videos.length > 0 && photos.length === 0) {
        // 只有视频，随机选择2个
        const shuffled = videos.sort(() => 0.5 - Math.random());
        selectedMedia.push(...shuffled.slice(0, Math.min(2, videos.length)));
      } else if (photos.length > 0 && videos.length > 0) {
        // 既有图片又有视频，各选1个
        const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
        const randomVideo = videos[Math.floor(Math.random() * videos.length)];
        selectedMedia.push(randomPhoto, randomVideo);
      }
    }

    if (selectedMedia.length === 0) {
      logger.warn('No media to publish to public channel');
      return;
    }

    // 使用自定义文本（如果提供）
    const caption = customCaption || '';

    // 如果只有一个文件，直接发送单个媒体
    if (selectedMedia.length === 1) {
      const media = selectedMedia[0];
      if (media.fileType === 'photo') {
        await ctx.api.sendPhoto(publicChannelId, media.fileId, { caption });
      } else if (media.fileType === 'video') {
        await ctx.api.sendVideo(publicChannelId, media.fileId, { caption });
      }
      logger.info(`Published single media to public channel`);
    } else {
      // 构建媒体组
      const mediaGroup: (InputMediaPhoto | InputMediaVideo)[] = selectedMedia.map((media, index) => {
        if (media.fileType === 'photo') {
          return {
            type: 'photo' as const,
            media: media.fileId,
            caption: index === 0 ? caption : undefined,
          };
        } else {
          return {
            type: 'video' as const,
            media: media.fileId,
            caption: index === 0 ? caption : undefined,
          };
        }
      });

      // 发送到公开频道
      await ctx.api.sendMediaGroup(publicChannelId, mediaGroup);
      logger.info(`Published media group to public channel with ${selectedMedia.length} files`);
    }
  } catch (error) {
    logger.error('Failed to publish to public channel', error);
  }
}

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

/**
 * 发布到两个频道
 */
export async function publishToChannels(ctx: Context, options: PublishOptions) {
  await Promise.all([
    publishToPublicChannel(ctx, options),
    publishToPrivateChannel(ctx, options),
  ]);
}
