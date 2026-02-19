import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context } from 'grammy';
import mediaService from '../../services/media';
import collectionService from '../../services/collection';
import userService from '../../services/user';
import { publishToChannels } from '../../services/channelPublisher';
import Logger from '../../utils/logger';

const logger = new Logger('TransferExecuteFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

interface UploadedFile {
  fileId: string;
  uniqueFileId: string;
  fileType: string;
}

interface TransferConfig {
  mode: 'all' | 'date_range';
  sourceChannel: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  contentType: ('photo' | 'video')[];
  keyword: string;
  title: string;
  description?: string;
  userId: number;
}

/**
 * 搬运执行流程会话（由 UserBot 触发）
 */
export async function transferExecuteFlow(conversation: MyConversation, ctx: MyContext) {
  // 从 session 中获取配置
  const config = (ctx.session as any).transferConfig as TransferConfig;

  if (!config) {
    logger.warn('No transfer config found in session');
    return;
  }

  const uploadedFiles: UploadedFile[] = [];
  let duplicateCount = 0;

  logger.info('transferExecuteFlow started, waiting for messages from UserBot...');

  // 循环等待接收转发的消息
  while (true) {
    const response = await conversation.wait();

    // 检查是否收到完成命令
    if (response.message?.text?.startsWith('/transfer_complete')) {
      logger.info('Received /transfer_complete command');
      break;
    }

    // 处理转发的媒体文件
    const message = response.message;
    let fileId: string | undefined;
    let uniqueFileId: string | undefined;
    let fileType: string | undefined;

    if (message?.photo) {
      const photo = message.photo[message.photo.length - 1];
      fileId = photo.file_id;
      uniqueFileId = photo.file_unique_id;
      fileType = 'photo';
    } else if (message?.video) {
      fileId = message.video.file_id;
      uniqueFileId = message.video.file_unique_id;
      fileType = 'video';
    }

    if (fileId && uniqueFileId && fileType) {
      // 检查去重
      const isDuplicate = await mediaService.checkDuplicate(uniqueFileId);

      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      uploadedFiles.push({ fileId, uniqueFileId, fileType });
    }
  }

  // 创建合集
  try {
    if (uploadedFiles.length === 0) {
      await ctx.api.sendMessage(
        config.userId,
        '⚠️ 搬运完成，但未收集到任何文件'
      );
      return;
    }

    const user = await userService.getOrCreateUser(config.userId, {});

    // 检查是否已存在相同标题的合集
    let collection = await collectionService.getCollectionByTitle(config.title, user.id);
    let isNewCollection = false;

    if (collection) {
      // 合集已存在，追加文件
      logger.info(`Collection "${config.title}" already exists, appending files`);

      const maxOrder = collection.mediaFiles.length > 0
        ? Math.max(...collection.mediaFiles.map(f => f.order))
        : -1;

      const mediaFiles = uploadedFiles.map((file, index) => ({
        collectionId: collection!.id,
        fileId: file.fileId,
        uniqueFileId: file.uniqueFileId,
        fileType: file.fileType,
        order: maxOrder + 1 + index,
      }));

      await mediaService.addMediaFiles(mediaFiles);

      // 重新获取完整的合集信息
      collection = await collectionService.getCollectionById(collection.id);
    } else {
      // 创建新合集
      isNewCollection = true;
      logger.info(`Creating new collection with title: ${config.title}`);

      const newCollection = await collectionService.createCollection({
        title: config.title,
        description: config.description || `从 ${config.sourceChannel} 搬运`,
        creatorId: user.id,
      });

      const mediaFiles = uploadedFiles.map((file, index) => ({
        collectionId: newCollection.id,
        fileId: file.fileId,
        uniqueFileId: file.uniqueFileId,
        fileType: file.fileType,
        order: index,
      }));

      await mediaService.addMediaFiles(mediaFiles);

      // 重新获取完整的合集信息
      collection = await collectionService.getCollectionById(newCollection.id);
    }

    if (!collection) {
      await ctx.api.sendMessage(
        config.userId,
        '❌ 操作失败，请稍后重试'
      );
      return;
    }

    // 生成深链
    const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

    // 通知管理员完成
    await ctx.api.sendMessage(
      config.userId,
      `✅ 搬运完成！\n\n` +
      `📦 合集：${config.title}\n` +
      `📝 描述：${config.description || '无'}\n` +
      `📁 ${isNewCollection ? '文件数量' : '新增文件'}：${uploadedFiles.length}\n` +
      `⚠️ 跳过重复：${duplicateCount}\n\n` +
      `🔗 访问链接：\n${deepLink}`
    );

    logger.info(`Collection ${isNewCollection ? 'created' : 'updated'}: ${collection.id} with ${uploadedFiles.length} files`);

    // 发布到频道
    await publishToChannels(ctx, {
      title: collection.title,
      description: collection.description || undefined,
      deepLink,
      mediaFiles: collection.mediaFiles.map(m => ({
        fileId: m.fileId,
        fileType: m.fileType,
      })),
    });
  } catch (error) {
    logger.error('Failed to create/update collection', error);
    await ctx.api.sendMessage(
      config.userId,
      '❌ 操作失败，请稍后重试'
    );
  }
}
