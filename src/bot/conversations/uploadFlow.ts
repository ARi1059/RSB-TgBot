import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import mediaService from '../../services/media';
import collectionService from '../../services/collection';
import userService from '../../services/user';
import { publishToPrivateChannel } from '../../services/channelPublisher';
import { createLogger } from '../../utils/logger';
import { KeyboardFactory } from '../ui';
import { showCancelWithMenuButton } from '../utils/helpers';

const logger = createLogger('UploadFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

interface UploadedFile {
  fileId: string;
  uniqueFileId: string;
  fileType: string;
  permissionLevel: number; // 添加权限字段
}

/**
 * 上传流程会话
 */
export async function uploadFlow(conversation: MyConversation, ctx: MyContext) {
  try {
    const uploadedFiles: UploadedFile[] = [];
    let duplicateCount = 0;
    let currentPermissionLevel = 0; // 当前权限级别，默认为0（免费）

    // 显示权限选择按钮
    const permissionKeyboard = new InlineKeyboard()
      .text('🆓 上传免费文件', 'upload_perm:0').row()
      .text('💰 上传付费文件', 'upload_perm:1').row()
      .text('👑 上传VIP文件', 'upload_perm:2').row()
      .text('❌ 取消', 'upload_cancel_start');

    await ctx.reply(
      '📤 上传模式已启动\n\n' +
      '请先选择要上传的文件类型：',
      { reply_markup: permissionKeyboard }
    );

    // 等待权限选择
    const permResponse = await conversation.wait();

    // 检查是否取消
    if (permResponse.callbackQuery?.data === 'upload_cancel_start') {
      await permResponse.answerCallbackQuery({ text: '已取消' });
      await showCancelWithMenuButton(ctx, '❌ 上传已取消');
      return;
    }

    if (permResponse.callbackQuery?.data?.startsWith('upload_perm:')) {
      currentPermissionLevel = parseInt(permResponse.callbackQuery.data.split(':')[1]);
      await permResponse.answerCallbackQuery({ text: '已选择' });

      const permText = currentPermissionLevel === 0 ? '🆓 免费' : currentPermissionLevel === 1 ? '💰 付费' : '👑 VIP';
      await ctx.reply(
        `当前上传模式：${permText}\n\n` +
        '请发送或转发媒体文件（图片、视频、文档、音频）\n' +
        '发送完成后，输入 /done 完成上传\n\n' +
        '💡 提示：你可以随时点击下方按钮切换上传模式',
        { reply_markup: permissionKeyboard }
      );
    }

    // 收集媒体文件（添加超时保护）
    const MAX_WAIT_TIME = 40 * 60 * 1000; // 40分钟超时
    const startTime = Date.now();

    while (true) {
      // 检查超时
      if (Date.now() - startTime > MAX_WAIT_TIME) {
        logger.warn('Upload flow timeout after 40 minutes');
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.reply('⏱️ 上传超时（40分钟），请重新开始', { reply_markup: keyboard });
        return;
      }
    const response = await conversation.wait();

    // 检查是否点击取消按钮
    if (response.callbackQuery?.data === 'upload_cancel_start') {
      await response.answerCallbackQuery({ text: '已取消' });
      await showCancelWithMenuButton(ctx, '❌ 上传已取消');
      return;
    }

    // 检查是否切换权限
    if (response.callbackQuery?.data?.startsWith('upload_perm:')) {
      currentPermissionLevel = parseInt(response.callbackQuery.data.split(':')[1]);
      const permText = currentPermissionLevel === 0 ? '🆓 免费' : currentPermissionLevel === 1 ? '💰 付费' : '👑 VIP';
      await response.answerCallbackQuery({ text: `已切换到${permText}模式` });
      await ctx.reply(
        `✅ 已切换到 ${permText} 模式\n\n` +
        `继续上传文件...\n` +
        `发送完成后，输入 /done 完成上传`
      );
      continue;
    }

    // 检查是否完成
    if (response.message?.text === '/done') {
      if (uploadedFiles.length === 0) {
        const keyboard = KeyboardFactory.createBackToMenuKeyboard();
        await ctx.reply('❌ 未上传任何文件，请至少上传一个文件', { reply_markup: keyboard });
        continue;
      }
      break;
    }

    // 检查是否取消
    if (response.message?.text === '/cancel') {
      await showCancelWithMenuButton(ctx, '❌ 已取消上传');
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
      // 检查去重（添加异常处理）
      try {
        const isDuplicate = await mediaService.checkDuplicate(uniqueFileId);

        if (isDuplicate) {
          duplicateCount++;
          await ctx.reply('⚠️ 此文件已存在，已跳过');
          continue;
        }

        uploadedFiles.push({ fileId, uniqueFileId, fileType, permissionLevel: currentPermissionLevel });
        const permText = currentPermissionLevel === 0 ? '🆓' : currentPermissionLevel === 1 ? '💰' : '👑';
        await ctx.reply(`✅ 已添加 ${permText} ${fileType}（共 ${uploadedFiles.length} 个文件）`);
      } catch (error) {
        logger.error(`Failed to check duplicate for file ${uniqueFileId}`, error);
        await ctx.reply('⚠️ 文件处理失败，已跳过');
      }
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
    await showCancelWithMenuButton(ctx, '❌ 上传已取消');
    return;
  }

  const title = titleResponse.message?.text;

  if (!title) {
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 标题不能为空，上传已取消', { reply_markup: keyboard });
    return;
  }

  // 请求描述
  const descKeyboard = KeyboardFactory.createSkipCancelKeyboard('upload_skip', 'upload_cancel');

  await ctx.reply('📝 请输入合集描述（可选）：', { reply_markup: descKeyboard });
  const descResponse = await conversation.wait();

  // 检查是否点击了跳过或取消按钮
  if (descResponse.callbackQuery?.data === 'upload_cancel') {
    await descResponse.answerCallbackQuery({ text: '已取消' });
    await showCancelWithMenuButton(ctx, '❌ 上传已取消');
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

    // 保存媒体文件，order 从 maxOrder + 1 开始，包含 permissionLevel
    const mediaFiles = uploadedFiles.map((file, index) => ({
      collectionId: collection!.id,
      fileId: file.fileId,
      uniqueFileId: file.uniqueFileId,
      fileType: file.fileType,
      permissionLevel: file.permissionLevel, // 添加权限字段
      order: maxOrder + 1 + index,
    }));

    await mediaService.addMediaFiles(mediaFiles);

    // 更新描述（直接覆盖）
    if (description !== undefined) {
      await collectionService.updateCollection(collection.id, { description });
      collection.description = description;
    }

    // 重新获取完整的合集信息（包含 mediaFiles）（管理员使用VIP权限）
    collection = await collectionService.getCollectionById(collection.id, 2);
  } else {
    // 创建新合集
    isNewCollection = true;

    // 计算合集权限：取所有文件的最低权限
    const minPermissionLevel = Math.min(...uploadedFiles.map(f => f.permissionLevel));

    const newCollection = await collectionService.createCollection({
      title,
      description,
      creatorId: user.id,
      permissionLevel: minPermissionLevel, // 设置合集权限为最低权限
    });

    // 保存媒体文件，包含 permissionLevel
    const mediaFiles = uploadedFiles.map((file, index) => ({
      collectionId: newCollection.id,
      fileId: file.fileId,
      uniqueFileId: file.uniqueFileId,
      fileType: file.fileType,
      permissionLevel: file.permissionLevel, // 添加权限字段
      order: index,
    }));

    await mediaService.addMediaFiles(mediaFiles);

    // 重新获取完整的合集信息（包含 mediaFiles）（管理员使用VIP权限）
    collection = await collectionService.getCollectionById(newCollection.id, 2);
  }

  // 如果是追加文件，重新计算合集权限
  if (!isNewCollection && collection) {
    const allFiles = collection.mediaFiles;
    const minPermissionLevel = Math.min(...allFiles.map(f => f.permissionLevel));
    await collectionService.updateCollection(collection.id, { permissionLevel: minPermissionLevel });
    collection.permissionLevel = minPermissionLevel;
  }

  // 确保 collection 不为 null
  if (!collection) {
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 操作失败，请稍后重试', { reply_markup: keyboard });
    return;
  }

  // 生成深链
  const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${collection.token}`;

  // 创建编辑、删除和返回菜单按钮
  const keyboard = new InlineKeyboard()
    .text('✏️ 编辑', `edit_collection:${collection.id}`)
    .text('🗑️ 删除', `delete_collection:${collection.id}`)
    .row()
    .text('🏠 返回菜单', 'back_to_menu');

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

  // 准备私密频道的默认文本
  let privateCaption = `📦 ${collection.title}`;
  if (collection.description) {
    privateCaption += `\n📝 ${collection.description}`;
  }

  // 自动发送本次上传的文件到私密频道（不进行权限校验，全部发送）
  await publishToPrivateChannel(ctx, {
    title: collection.title,
    description: collection.description || undefined,
    deepLink,
    mediaFiles: uploadedFiles.map(f => ({
      fileId: f.fileId,
      fileType: f.fileType,
    })),
    customCaption: privateCaption,
  });

  logger.info(`Published ${uploadedFiles.length} uploaded files to private channel for collection ${collection.id}`);

  // 上传完成，显示成功消息
  await showCancelWithMenuButton(ctx, '✅ 已成功发送到私密频道！');
  logger.info(`Upload flow completed for collection ${collection.id}`);
  } catch (error) {
    logger.error('Upload flow error', error);
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 上传流程出错，请稍后重试', { reply_markup: keyboard });
  }
}
