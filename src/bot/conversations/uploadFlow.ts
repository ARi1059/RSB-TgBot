import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import mediaService from '../../services/media';
import collectionService from '../../services/collection';
import userService from '../../services/user';
import { publishToChannels } from '../../services/channelPublisher';
import { createLogger } from '../../utils/logger';
import { KeyboardFactory } from '../ui';

const logger = createLogger('UploadFlow');

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
    '发送完成后，输入 /done 完成上传'
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
  const titleKeyboard = KeyboardFactory.createCancelKeyboard('upload_cancel');

  await ctx.reply('📝 请输入合集标题：', { reply_markup: titleKeyboard });
  const titleResponse = await conversation.wait();

  // 检查是否点击了取消按钮
  if (titleResponse.callbackQuery?.data === 'upload_cancel') {
    await titleResponse.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 上传已取消');
    return;
  }

  const title = titleResponse.message?.text;

  if (!title) {
    await ctx.reply('❌ 标题不能为空，上传已取消');
    return;
  }

  // 请求描述
  const descKeyboard = KeyboardFactory.createSkipCancelKeyboard('upload_skip', 'upload_cancel');

  await ctx.reply('📝 请输入合集描述（可选）：', { reply_markup: descKeyboard });
  const descResponse = await conversation.wait();

  // 检查是否点击了跳过或取消按钮
  if (descResponse.callbackQuery?.data === 'upload_cancel') {
    await descResponse.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 上传已取消');
    return;
  }

  let description: string | undefined;
  if (descResponse.callbackQuery?.data === 'upload_skip') {
    await descResponse.answerCallbackQuery({ text: '已跳过' });
    description = undefined;
  } else {
    description = descResponse.message?.text;
  }

  // 保存合集
  try {
    const user = await userService.getOrCreateUser(ctx.from!.id, {
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      username: ctx.from?.username,
    });

    // 检查是否已存在相同标题的合集
    let collection = await collectionService.getCollectionByTitle(title, user.id);
    let isNewCollection = false;

    if (collection) {
      // 合集已存在，追加文件
      await ctx.reply(`📦 检测到已存在的合集"${title}"，将追加文件到该合集`);

      // 获取当前最大的 order 值
      const maxOrder = collection.mediaFiles.length > 0
        ? Math.max(...collection.mediaFiles.map(f => f.order))
        : -1;

      // 保存媒体文件，order 从 maxOrder + 1 开始
      const mediaFiles = uploadedFiles.map((file, index) => ({
        collectionId: collection!.id,
        fileId: file.fileId,
        uniqueFileId: file.uniqueFileId,
        fileType: file.fileType,
        order: maxOrder + 1 + index,
      }));

      await mediaService.addMediaFiles(mediaFiles);

      // 更新描述（直接覆盖）
      if (description !== undefined) {
        await collectionService.updateCollection(collection.id, { description });
        collection.description = description;
      }

      // 重新获取完整的合集信息（包含 mediaFiles）
      collection = await collectionService.getCollectionById(collection.id);
    } else {
      // 创建新合集
      isNewCollection = true;
      const newCollection = await collectionService.createCollection({
        title,
        description,
        creatorId: user.id,
      });

      // 保存媒体文件
      const mediaFiles = uploadedFiles.map((file, index) => ({
        collectionId: newCollection.id,
        fileId: file.fileId,
        uniqueFileId: file.uniqueFileId,
        fileType: file.fileType,
        order: index,
      }));

      await mediaService.addMediaFiles(mediaFiles);

      // 重新获取完整的合集信息（包含 mediaFiles）
      collection = await collectionService.getCollectionById(newCollection.id);
    }

    // 确保 collection 不为 null
    if (!collection) {
      await ctx.reply('❌ 操作失败，请稍后重试');
      return;
    }

    // 生成深链
    const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

    // 创建编辑和删除按钮
    const keyboard = new InlineKeyboard()
      .text('✏️ 编辑', `edit_collection:${collection.id}`)
      .text('🗑️ 删除', `delete_collection:${collection.id}`);

    await ctx.reply(
      `✅ ${isNewCollection ? '合集创建成功' : '文件追加成功'}！\n\n` +
      `📦 标题：${title}\n` +
      `📝 描述：${collection.description || '无'}\n` +
      `📁 ${isNewCollection ? '文件数量' : '新增文件'}：${uploadedFiles.length}\n` +
      `⚠️ 跳过重复：${duplicateCount}\n\n` +
      `🔗 分享链接：\n${deepLink}`,
      { reply_markup: keyboard }
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
    await ctx.reply('❌ 操作失败，请稍后重试');
  }
}
