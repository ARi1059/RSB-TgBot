import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import collectionService from '../../services/collection';
import mediaService from '../../services/media';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EditCollectionFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

/**
 * 编辑合集会话流程
 */
export async function editCollectionFlow(conversation: MyConversation, ctx: MyContext) {
  const collectionId = (ctx as any).session.editCollectionId;

  if (!collectionId) {
    await ctx.reply('❌ 未找到要编辑的合集');
    return;
  }

  // 获取合集信息
  const originalCollection = await collectionService.getCollectionById(collectionId);

  if (!originalCollection) {
    await ctx.reply('❌ 合集不存在');
    return;
  }

  const originalTitle = originalCollection.title;

  const titleKeyboard = new InlineKeyboard()
    .text('⏭️ 跳过', 'edit_skip')
    .text('❌ 取消', 'edit_cancel');

  await ctx.reply(
    `📝 编辑合集\n\n` +
    `当前标题：${originalCollection.title}\n` +
    `当前描述：${originalCollection.description || '无'}\n\n` +
    `请输入新的标题：`,
    { reply_markup: titleKeyboard }
  );

  // 获取新标题
  const titleResponse = await conversation.wait();

  // 检查是否点击了取消按钮
  if (titleResponse.callbackQuery?.data === 'edit_cancel') {
    await titleResponse.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 已取消编辑');
    return;
  }

  let newTitle: string;
  if (titleResponse.callbackQuery?.data === 'edit_skip') {
    await titleResponse.answerCallbackQuery({ text: '已跳过' });
    newTitle = originalTitle;
  } else {
    const titleText = titleResponse.message?.text;
    if (!titleText) {
      await ctx.reply('❌ 标题不能为空');
      return;
    }
    newTitle = titleText;
  }

  // 获取新描述
  const descKeyboard = new InlineKeyboard()
    .text('⏭️ 跳过', 'edit_skip')
    .text('❌ 取消', 'edit_cancel');

  await ctx.reply('📝 请输入新的描述：', { reply_markup: descKeyboard });
  const descResponse = await conversation.wait();

  // 检查是否点击了取消按钮
  if (descResponse.callbackQuery?.data === 'edit_cancel') {
    await descResponse.answerCallbackQuery({ text: '已取消' });
    await ctx.reply('❌ 已取消编辑');
    return;
  }

  let newDescription: string | undefined;
  if (descResponse.callbackQuery?.data === 'edit_skip') {
    await descResponse.answerCallbackQuery({ text: '已跳过' });
    newDescription = originalCollection.description || undefined;
  } else {
    newDescription = descResponse.message?.text;
  }

  try {
    const user = ctx.from!;

    // 检查标题是否修改
    if (newTitle !== originalTitle) {
      // 标题修改了，检查新标题是否与其他合集重复
      const existingCollection = await collectionService.getCollectionByTitle(newTitle, originalCollection.creatorId);

      if (existingCollection && existingCollection.id !== collectionId) {
        // 新标题与其他合集重复，执行追加逻辑
        await ctx.reply(`📦 检测到已存在的合集"${newTitle}"，将把当前合集的文件追加到该合集，并删除当前合集`);

        // 获取当前合集的所有文件
        const currentCollectionFull = await collectionService.getCollectionByToken(originalCollection.token);

        if (!currentCollectionFull) {
          await ctx.reply('❌ 获取合集文件失败');
          return;
        }

        // 获取目标合集的最大 order
        const targetCollection = await collectionService.getCollectionByToken(existingCollection.token);
        const maxOrder = targetCollection && targetCollection.mediaFiles.length > 0
          ? Math.max(...targetCollection.mediaFiles.map((f: any) => f.order))
          : -1;

        // 将当前合集的文件追加到目标合集
        const mediaFiles = currentCollectionFull.mediaFiles.map((file: any, index: number) => ({
          collectionId: existingCollection.id,
          fileId: file.fileId,
          uniqueFileId: file.uniqueFileId,
          fileType: file.fileType,
          order: maxOrder + 1 + index,
        }));

        await mediaService.addMediaFiles(mediaFiles);

        // 更新目标合集的描述
        if (newDescription !== undefined) {
          await collectionService.updateCollection(existingCollection.id, { description: newDescription });
        }

        // 删除当前合集
        await collectionService.deleteCollection(collectionId);

        const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${existingCollection.token}`;

        await ctx.reply(
          `✅ 合集已合并！\n\n` +
          `📦 标题：${newTitle}\n` +
          `📝 描述：${newDescription || '无'}\n` +
          `📁 总文件数：${targetCollection!.mediaFiles.length + currentCollectionFull.mediaFiles.length}\n\n` +
          `🔗 分享链接：\n${deepLink}`
        );

        logger.info(`Collection ${collectionId} merged into ${existingCollection.id}`);
      } else {
        // 新标题不重复，直接更新
        await collectionService.updateCollection(collectionId, {
          title: newTitle,
          description: newDescription,
        });

        const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${originalCollection.token}`;

        await ctx.reply(
          `✅ 合集更新成功！\n\n` +
          `📦 标题：${newTitle}\n` +
          `📝 描述：${newDescription || '无'}\n\n` +
          `🔗 分享链接：\n${deepLink}`
        );

        logger.info(`Collection ${collectionId} updated`);
      }
    } else {
      // 标题未修改，只更新描述
      await collectionService.updateCollection(collectionId, {
        description: newDescription,
      });

      const deepLink = `https://t.me/${process.env.BOT_USERNAME}?start=${originalCollection.token}`;

      await ctx.reply(
        `✅ 合集更新成功！\n\n` +
        `📦 标题：${newTitle}\n` +
        `📝 描述：${newDescription || '无'}\n\n` +
        `🔗 分享链接：\n${deepLink}`
      );

      logger.info(`Collection ${collectionId} description updated`);
    }
  } catch (error) {
    logger.error('Failed to edit collection', error);
    await ctx.reply('❌ 编辑失败，请稍后重试');
  }
}
