import { InlineKeyboard } from 'grammy';
import { Config } from '../../../config';

/**
 * 合集消息构建器
 * 负责构建所有与合集相关的消息文本
 */
export class CollectionMessageBuilder {
  /**
   * 构建合集列表消息
   */
  static buildListMessage(options: {
    collections: any[];
    total: number;
    page: number;
    totalPages: number;
    keyword?: string;
    isAdmin?: boolean;
  }): string {
    const { collections, total, page, totalPages, keyword } = options;

    let message = keyword
      ? `🔍 搜索结果：找到 ${total} 个匹配的合集\n\n`
      : `📚 可访问的合集列表（共 ${total} 个）\n\n`;

    for (const collection of collections) {
      message += this.buildCollectionItem(collection);
    }

    message += `📄 第 ${page}/${totalPages} 页`;

    return message;
  }

  /**
   * 构建单个合集项
   */
  static buildCollectionItem(collection: any): string {
    const deepLink = `https://t.me/${Config.BOT_USERNAME}?start=${collection.token}`;

    // 统计视频和图片数量
    const photoCount = collection.mediaFiles?.filter((f: any) => f.fileType === 'photo').length || 0;
    const videoCount = collection.mediaFiles?.filter((f: any) => f.fileType === 'video').length || 0;

    // 标题
    let item = `📦 ${collection.title}\n`;

    // 描述（如果有）
    if (collection.description) {
      item += `📝 ${collection.description}\n`;
    }

    // 文件数统计（为0的不展示）
    const fileCounts = [];
    if (videoCount > 0) {
      fileCounts.push(`🎥 ${videoCount}个视频`);
    }
    if (photoCount > 0) {
      fileCounts.push(`🖼️ ${photoCount}张图片`);
    }
    if (fileCounts.length > 0) {
      item += `📁 ${fileCounts.join(' | ')}\n`;
    }

    // 深链接（空一行展示）
    item += `\n🔗 ${deepLink}\n\n`;

    return item;
  }

  /**
   * 构建合集详情消息
   */
  static buildDetailMessage(collection: any, userLevel: number): string {
    const accessiblePhotos = collection.mediaFiles.filter((f: any) => f.fileType === 'photo').length;
    const accessibleVideos = collection.mediaFiles.filter((f: any) => f.fileType === 'video').length;

    let message = `📦 ${collection.title}\n\n`;

    if (collection.description) {
      message += `📝 ${collection.description}\n\n`;
    }

    message += `📊 文件统计：\n`;
    if (accessibleVideos > 0) {
      message += `🎥 视频：${accessibleVideos} 个\n`;
    }
    if (accessiblePhotos > 0) {
      message += `🖼️ 图片：${accessiblePhotos} 张\n`;
    }

    return message;
  }

  /**
   * 构建权限不足消息
   */
  static buildPermissionDeniedMessage(
    accessibleCount: number,
    restrictedCount: number,
    adminContact: string
  ): string {
    return `⚠️ 权限不足\n\n` +
      `您可以访问 ${accessibleCount} 个文件\n` +
      `${restrictedCount} 个文件需要更高权限\n\n` +
      `请联系 ${adminContact} 升级账户以访问这些资源`;
  }

  /**
   * 构建删除确认消息
   */
  static buildDeleteConfirmMessage(collection: any): string {
    return `⚠️ 确认删除合集？\n\n` +
      `📦 标题：${collection.title}\n` +
      `📁 文件数量：${collection.mediaFiles.length}\n\n` +
      `此操作不可撤销！`;
  }

  /**
   * 构建编辑合集消息
   */
  static buildEditMessage(collection: any): string {
    let message = `📝 编辑合集\n\n`;
    message += `📦 标题：${collection.title}\n`;
    message += `📝 描述：${collection.description || '无'}\n`;
    message += `📁 文件数量：${collection.mediaFiles.length}\n`;
    return message;
  }
}
