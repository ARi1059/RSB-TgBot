import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import mediaService from '../../services/media';
import collectionService from '../../services/collection';
import userService from '../../services/user';
import { publishToPrivateChannel } from '../../services/channelPublisher';
import { createLogger } from '../../utils/logger';
import { KeyboardFactory } from '../ui/keyboards/KeyboardFactory';
import { TRANSFER_CONFIG } from '../../constants';

const logger = createLogger('TransferExecuteFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

interface UploadedFile {
  fileId: string;
  uniqueFileId: string;
  fileType: string;
  permissionLevel?: number; // 权限级别（可选，默认为0）
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
  try {
    // 从 session 中获取配置
    const config = (ctx.session as any).transferConfig as TransferConfig;

    if (!config) {
      logger.warn('No transfer config found in session');
      return;
    }

    let uploadedFiles: UploadedFile[] = [];
    let duplicateCount = 0;

    logger.info('transferExecuteFlow started, waiting for messages from UserBot...');

    // 循环等待接收转发的消息（添加超时保护）
    const MAX_WAIT_TIME = 40 * 60 * 1000; // 40分钟超时
    const startTime = Date.now();

    while (true) {
      // 检查超时
      if (Date.now() - startTime > MAX_WAIT_TIME) {
        logger.warn('Transfer execute flow timeout after 40 minutes');
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.api.sendMessage(
          config.userId,
          '⏱️ 搬运超时（40分钟），已收集的文件将被保存',
          { reply_markup: keyboard }
        );
        break;
      }

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
        uploadedFiles.push({ fileId, uniqueFileId, fileType });
        logger.debug(`Collected file: ${fileType}, total: ${uploadedFiles.length}`);

        // 批量去重检查（每收集 N 个文件检查一次）
        if (uploadedFiles.length % TRANSFER_CONFIG.DB_BATCH_SIZE === 0) {
          logger.info(`Performing batch duplicate check for ${uploadedFiles.length} files`);
          const uniqueFileIds = uploadedFiles.map(f => f.uniqueFileId);

          // 批量查询去重
          const duplicates = await mediaService.batchCheckDuplicates(uniqueFileIds);

          // 过滤掉重复的文件
          const beforeCount = uploadedFiles.length;
          uploadedFiles = uploadedFiles.filter(f => !duplicates.includes(f.uniqueFileId));
          duplicateCount += (beforeCount - uploadedFiles.length);

          if (duplicateCount > 0) {
            logger.info(`Removed ${duplicateCount} duplicate files`);
          }
        }
      }
    }

    // 创建合集
    if (uploadedFiles.length === 0) {
      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.api.sendMessage(
        config.userId,
        '⚠️ 搬运完成，但未收集到任何文件',
        { reply_markup: keyboard }
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
        permissionLevel: 0, // 搬运的文件权限设为0
        order: maxOrder + 1 + index,
      }));

      await mediaService.addMediaFiles(mediaFiles);

      // 重新获取完整的合集信息（管理员使用VIP权限）
      collection = await collectionService.getCollectionById(collection.id, 2);
    } else {
      // 创建新合集
      isNewCollection = true;
      logger.info(`Creating new collection with title: ${config.title}`);

      const newCollection = await collectionService.createCollection({
        title: config.title,
        description: config.description,
        creatorId: user.id,
        permissionLevel: 0, // 搬运的合集权限设为0
      });

      const mediaFiles = uploadedFiles.map((file, index) => ({
        collectionId: newCollection.id,
        fileId: file.fileId,
        uniqueFileId: file.uniqueFileId,
        fileType: file.fileType,
        permissionLevel: 0, // 搬运的文件权限设为0
        order: index,
      }));

      await mediaService.addMediaFiles(mediaFiles);

      // 重新获取完整的合集信息（管理员使用VIP权限）
      collection = await collectionService.getCollectionById(newCollection.id, 2);
    }

    if (!collection) {
      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.api.sendMessage(
        config.userId,
        '❌ 操作失败，请稍后重试',
        { reply_markup: keyboard }
      );
      return;
    }

    // 生成深链
    const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

    // 通知管理员完成
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.api.sendMessage(
      config.userId,
      `✅ 搬运完成！\n\n` +
      `📦 合集：${config.title}\n` +
      `📝 描述：${config.description || '无'}\n` +
      `📁 ${isNewCollection ? '文件数量' : '新增文件'}：${uploadedFiles.length}\n` +
      `⚠️ 跳过重复：${duplicateCount}\n\n` +
      `🔗 访问链接：\n${deepLink}`,
      { reply_markup: keyboard }
    );

    logger.info(`Collection ${isNewCollection ? 'created' : 'updated'}: ${collection.id} with ${uploadedFiles.length} files`);

    // 发布到频道（使用默认文本）
    const photoCount = collection.mediaFiles.filter(m => m.fileType === 'photo').length;
    const videoCount = collection.mediaFiles.filter(m => m.fileType === 'video').length;

    let defaultCaption = `📦 ${collection.title}\n`;
    if (collection.description) {
      defaultCaption += `📝 ${collection.description}\n`;
    }
    defaultCaption += '\n📁 文件总数：';
    const counts: string[] = [];
    if (photoCount > 0) counts.push(`${photoCount}张图片`);
    if (videoCount > 0) counts.push(`${videoCount}个视频`);
    defaultCaption += counts.join('、');
    defaultCaption += `\n\n🔗 ${deepLink}`;

    await publishToPrivateChannel(ctx, {
      title: collection.title,
      description: collection.description || undefined,
      deepLink,
      mediaFiles: collection.mediaFiles.map(m => ({
        fileId: m.fileId,
        fileType: m.fileType,
      })),
      customCaption: defaultCaption,
    });

    logger.info(`Transfer execute flow completed successfully for collection ${collection.id}`);
  } catch (error) {
    logger.error('Transfer execute flow error', error);

    // 尝试通知用户（如果 config 可用）
    try {
      const config = (ctx.session as any).transferConfig as TransferConfig;
      if (config?.userId) {
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.api.sendMessage(
          config.userId,
          '❌ 搬运流程出错，请稍后重试',
          { reply_markup: keyboard }
        );
      }
    } catch (notifyError) {
      logger.error('Failed to notify user about error', notifyError);
    }
  }
}
