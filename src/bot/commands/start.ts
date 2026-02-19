import { Bot } from 'grammy';
import { createLogger } from '../../utils/logger';
import { renderTemplate } from '../../utils/template';
import { MyContext } from '../middlewares/session';
import userService from '../../services/user';
import collectionService from '../../services/collection';
import settingService from '../../services/setting';
import permissionService from '../../services/permission';
import { sendMediaGroup } from '../handlers/media';
import { KeyboardFactory } from '../ui/keyboards/KeyboardFactory';
import { MediaFile } from '@prisma/client';

const logger = createLogger('StartCommand');

/**
 * 注册 /start 命令
 */
export function registerStartCommand(bot: Bot<MyContext>): void {
  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // 获取或创建用户
    const user = await userService.getOrCreateUser(userId, {
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      username: ctx.from?.username,
    });

    // 检查是否有深链参数
    const startParam = ctx.match;

    if (startParam) {
      // 深链访问 - 展示合集（带权限验证）
      await handleDeepLink(ctx, startParam as string, user.userLevel);
    } else {
      // 普通访问 - 显示欢迎消息和命令按钮
      await handleWelcome(ctx, userId);
    }
  });
}

/**
 * 处理深链访问
 */
async function handleDeepLink(ctx: MyContext, token: string, userLevel: number): Promise<void> {
  const collection = await collectionService.getCollectionByToken(token, userLevel);

  if (!collection) {
    // 尝试获取合集信息（不带权限过滤）来判断是权限不足还是不存在
    const collectionWithoutPermission = await collectionService.getCollectionByToken(token, 2); // VIP权限查询

    if (collectionWithoutPermission) {
      // 合集存在但权限不足
      await handlePermissionDenied(ctx, collectionWithoutPermission);
    } else {
      // 合集不存在
      const keyboard = KeyboardFactory.createBackToMenuKeyboard();
      await ctx.reply('❌ 合集不存在或已被删除', { reply_markup: keyboard });
    }
    return;
  }

  // 获取完整合集信息（用于统计总文件数）
  const fullCollection = await collectionService.getCollectionByToken(token, 2); // VIP权限获取全部文件

  if (!fullCollection) {
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 合集不存在或已被删除', { reply_markup: keyboard });
    return;
  }

  // 统计用户可访问的文件
  const accessiblePhotos = collection.mediaFiles.filter((f: MediaFile) => f.fileType === 'photo').length;
  const accessibleVideos = collection.mediaFiles.filter((f: MediaFile) => f.fileType === 'video').length;

  // 统计全部文件
  const totalPhotos = fullCollection.mediaFiles.filter((f: MediaFile) => f.fileType === 'photo').length;
  const totalVideos = fullCollection.mediaFiles.filter((f: MediaFile) => f.fileType === 'video').length;

  // 判断是否有受限文件
  const hasRestrictedFiles = collection.mediaFiles.length < fullCollection.mediaFiles.length;

  if (collection.mediaFiles.length === 0) {
    // 没有可访问的文件
    await handleNoAccessibleFiles(ctx, collection, totalPhotos, totalVideos);
    return;
  }

  // 构建文件信息提示
  const fileInfoMessage = buildFileInfoMessage(
    collection,
    accessiblePhotos,
    accessibleVideos,
    totalPhotos,
    totalVideos,
    hasRestrictedFiles
  );

  // 发送合集信息（不添加按钮，因为后面还会发送媒体组）
  await ctx.reply(fileInfoMessage);

  // 准备媒体文件数组
  const mediaFiles = collection.mediaFiles.map((media: MediaFile) => ({
    fileId: media.fileId,
    fileType: media.fileType,
  }));

  // 以媒体组形式发送所有文件
  try {
    await sendMediaGroup(ctx, mediaFiles);

    // 发送完成提示，并添加返回菜单按钮
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('✅ 所有文件发送完成！', { reply_markup: keyboard });
  } catch (error) {
    logger.error('Failed to send media group', error);

    // 发送失败提示，也添加返回菜单按钮
    const keyboard = KeyboardFactory.createBackToMenuKeyboard();
    await ctx.reply('❌ 部分文件发送失败', { reply_markup: keyboard });
  }
}

/**
 * 处理权限不足情况
 */
async function handlePermissionDenied(ctx: MyContext, collection: any): Promise<void> {
  const requiredLevel = collection.permissionLevel;
  let levelName = '';
  const contactInfo = permissionService.getAdminContact();

  if (requiredLevel === 1) {
    levelName = '付费用户';
  } else if (requiredLevel === 2) {
    levelName = 'VIP用户';
  }

  const keyboard = KeyboardFactory.createBackToMenuKeyboard();
  await ctx.reply(
    `🔒 该资源为${levelName}专属\n\n` +
    `📦 合集：${collection.title}\n` +
    `📝 描述：${collection.description || '无'}\n\n` +
    `请联系 ${contactInfo} 升级账户以访问此资源`,
    { reply_markup: keyboard }
  );
}

/**
 * 处理没有可访问文件的情况
 */
async function handleNoAccessibleFiles(
  ctx: MyContext,
  collection: any,
  totalPhotos: number,
  totalVideos: number
): Promise<void> {
  let fileInfo = '';
  if (totalPhotos > 0) fileInfo += `${totalPhotos}张图片`;
  if (totalVideos > 0) {
    if (fileInfo) fileInfo += '、';
    fileInfo += `${totalVideos}个视频`;
  }

  const keyboard = KeyboardFactory.createBackToMenuKeyboard();
  await ctx.reply(
    `🔒 该合集中的所有文件需要更高权限\n\n` +
    `📦 合集：${collection.title}\n` +
    `📝 描述：${collection.description || '无'}\n` +
    `📁 文件总数：${fileInfo}\n\n` +
    `请联系 ${permissionService.getAdminContact()} 升级账户以访问这些资源`,
    { reply_markup: keyboard }
  );
}

/**
 * 构建文件信息消息
 */
function buildFileInfoMessage(
  collection: any,
  accessiblePhotos: number,
  accessibleVideos: number,
  totalPhotos: number,
  totalVideos: number,
  hasRestrictedFiles: boolean
): string {
  let message = `📦 合集：${collection.title}\n` +
    `📝 描述：${collection.description || '无'}\n`;

  if (hasRestrictedFiles) {
    // 有部分文件受限
    message += `\n📁 您可访问的文件：`;
    const accessibleInfo: string[] = [];
    if (accessiblePhotos > 0) accessibleInfo.push(`${accessiblePhotos}张图片`);
    if (accessibleVideos > 0) accessibleInfo.push(`${accessibleVideos}个视频`);
    message += accessibleInfo.join('、');

    message += `\n🔒 更多文件需升级：`;
    const restrictedInfo: string[] = [];
    const restrictedPhotos = totalPhotos - accessiblePhotos;
    const restrictedVideos = totalVideos - accessibleVideos;
    if (restrictedPhotos > 0) restrictedInfo.push(`${restrictedPhotos}张图片`);
    if (restrictedVideos > 0) restrictedInfo.push(`${restrictedVideos}个视频`);
    message += restrictedInfo.join('、');

    message += `\n\n💡 请联系 ${permissionService.getAdminContact()} 升级账户以访问更多资源\n\n正在发送可访问的文件...`;
  } else {
    // 所有文件都可访问
    const fileInfo: string[] = [];
    if (accessiblePhotos > 0) fileInfo.push(`${accessiblePhotos}张图片`);
    if (accessibleVideos > 0) fileInfo.push(`${accessibleVideos}个视频`);
    message += `\n📁 文件数量：${fileInfo.join('、')}\n\n正在发送文件...`;
  }

  return message;
}

/**
 * 处理欢迎消息
 */
async function handleWelcome(ctx: MyContext, userId: number): Promise<void> {
  const welcomeMessage = await settingService.getWelcomeMessage();

  // 检查是否为管理员
  const isAdmin = permissionService.isAdmin(userId);

  // 使用 KeyboardFactory 构建主菜单
  const keyboard = KeyboardFactory.createMainMenuKeyboard(isAdmin);

  try {
    // 尝试解析为 JSON（新格式，包含 entities）
    const messageData = JSON.parse(welcomeMessage);

    // 渲染文本中的变量
    const renderedText = renderTemplate(messageData.text, {
      user_first_name: ctx.from?.first_name || '',
      user_last_name: ctx.from?.last_name || '',
      user_username: ctx.from?.username || '',
    });

    // 发送消息，包含 entities
    await ctx.reply(renderedText, {
      entities: messageData.entities, // 传递消息实体（包括 Premium Emoji）
      reply_markup: keyboard,
    });
  } catch (error) {
    // 如果解析失败，说明是旧格式（纯文本）
    const renderedMessage = renderTemplate(welcomeMessage, {
      user_first_name: ctx.from?.first_name || '',
      user_last_name: ctx.from?.last_name || '',
      user_username: ctx.from?.username || '',
    });

    await ctx.reply(renderedMessage, {
      reply_markup: keyboard,
    });
  }
}

