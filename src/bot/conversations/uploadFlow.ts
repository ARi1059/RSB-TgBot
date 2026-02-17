import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context } from 'grammy';
import mediaService from '../../services/media';
import collectionService from '../../services/collection';
import userService from '../../services/user';
import Logger from '../../utils/logger';

const logger = new Logger('UploadFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

interface UploadedFile {
  fileId: string;
  uniqueFileId: string;
  fileType: string;
}

/**
 * 上传流程会话
 */
export async function uploadFlow(conversation: MyConversation, ctx: MyContext) {
  const uploadedFiles: UploadedFile[] = [];
  let duplicateCount = 0;

  await ctx.reply(
    '📤 上传模式已启动\n\n' +
    '请发送或转发媒体文件（图片、视频、文档、音频）\n' +
    '发送完成后，输入 /done 完成上传\n' +
    '输入 /cancel 取消上传'
  );

  // 收集媒体文件
  while (true) {
    const response = await conversation.wait();

    // 检查是否完成
    if (response.message?.text === '/done') {
      if (uploadedFiles.length === 0) {
        await ctx.reply('❌ 未上传任何文件，请至少上传一个文件');
        continue;
      }
      break;
    }

    // 检查是否取消
    if (response.message?.text === '/cancel') {
      await ctx.reply('❌ 已取消上传');
      return;
    }

    // 处理媒体文件
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
    } else if (message?.document) {
      fileId = message.document.file_id;
      uniqueFileId = message.document.file_unique_id;
      fileType = 'document';
    } else if (message?.audio) {
      fileId = message.audio.file_id;
      uniqueFileId = message.audio.file_unique_id;
      fileType = 'audio';
    }

    if (fileId && uniqueFileId && fileType) {
      // 检查去重
      const isDuplicate = await mediaService.checkDuplicate(uniqueFileId);

      if (isDuplicate) {
        duplicateCount++;
        await ctx.reply('⚠️ 此文件已存在，已跳过');
        continue;
      }

      uploadedFiles.push({ fileId, uniqueFileId, fileType });
      await ctx.reply(`✅ 已添加 ${fileType}（共 ${uploadedFiles.length} 个文件）`);
    } else {
      await ctx.reply('⚠️ 请发送有效的媒体文件');
    }
  }

  // 请求标题
  await ctx.reply('📝 请输入合集标题：');
  const titleResponse = await conversation.wait();
  const title = titleResponse.message?.text;

  if (!title) {
    await ctx.reply('❌ 标题不能为空，上传已取消');
    return;
  }

  // 请求描述
  await ctx.reply('📝 请输入合集描述（可选，输入 /skip 跳过）：');
  const descResponse = await conversation.wait();
  const description = descResponse.message?.text === '/skip' ? undefined : descResponse.message?.text;

  // 保存合集
  try {
    const user = await userService.getOrCreateUser(ctx.from!.id, {
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      username: ctx.from?.username,
    });

    const collection = await collectionService.createCollection({
      title,
      description,
      creatorId: user.id,
    });

    // 保存媒体文件
    const mediaFiles = uploadedFiles.map((file, index) => ({
      collectionId: collection.id,
      fileId: file.fileId,
      uniqueFileId: file.uniqueFileId,
      fileType: file.fileType,
      order: index,
    }));

    await mediaService.addMediaFiles(mediaFiles);

    // 生成深链
    const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

    await ctx.reply(
      '✅ 合集创建成功！\n\n' +
      `📦 标题：${title}\n` +
      `📝 描述：${description || '无'}\n` +
      `📁 文件数量：${uploadedFiles.length}\n` +
      `⚠️ 跳过重复：${duplicateCount}\n\n` +
      `🔗 分享链接：\n${deepLink}`
    );

    logger.info(`Collection created: ${collection.id} with ${uploadedFiles.length} files`);
  } catch (error) {
    logger.error('Failed to create collection', error);
    await ctx.reply('❌ 创建合集失败，请稍后重试');
  }
}
