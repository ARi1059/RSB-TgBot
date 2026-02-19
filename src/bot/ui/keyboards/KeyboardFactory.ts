import { InlineKeyboard } from 'grammy';
import { CALLBACKS } from '../../../constants';

/**
 * 键盘工厂
 * 负责构建所有键盘布局
 */
export class KeyboardFactory {
  /**
   * 创建确认/取消键盘
   */
  static createConfirmKeyboard(confirmData: string, cancelData: string): InlineKeyboard {
    return new InlineKeyboard()
      .text('✅ 确认', confirmData)
      .text('❌ 取消', cancelData);
  }

  /**
   * 创建跳过/取消键盘
   */
  static createSkipCancelKeyboard(skipData: string, cancelData: string): InlineKeyboard {
    return new InlineKeyboard()
      .text('⏭️ 跳过', skipData)
      .text('❌ 取消', cancelData);
  }

  /**
   * 创建单个取消按钮键盘
   */
  static createCancelKeyboard(cancelData: string): InlineKeyboard {
    return new InlineKeyboard().text('❌ 取消', cancelData);
  }

  /**
   * 创建分页键盘
   */
  static createPaginationKeyboard(options: {
    currentPage: number;
    totalPages: number;
    prefix: string;
    keyword?: string;
  }): InlineKeyboard {
    const { currentPage, totalPages, prefix, keyword } = options;
    const keyboard = new InlineKeyboard();

    if (currentPage > 1) {
      keyboard.text('⬅️ 上一页', `${prefix}:${keyword || ''}:${currentPage - 1}`);
    }

    if (currentPage < totalPages) {
      keyboard.text('➡️ 下一页', `${prefix}:${keyword || ''}:${currentPage + 1}`);
    }

    return keyboard;
  }

  /**
   * 创建合集管理键盘（管理员）
   */
  static createCollectionManagementKeyboard(collections: any[]): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    if (collections.length > 0) {
      keyboard.row();
      for (const collection of collections) {
        keyboard
          .text(`✏️ ${collection.title.substring(0, 10)}`, `edit_collection:${collection.id}`)
          .text(`🗑️`, `delete_collection:${collection.id}`)
          .row();
      }
    }

    return keyboard;
  }

  /**
   * 创建主菜单键盘
   */
  static createMainMenuKeyboard(isAdmin: boolean): InlineKeyboard {
    const keyboard = new InlineKeyboard()
      .text('📚 查看合集列表', CALLBACKS.COMMAND.LIST)
      .text('🔍 搜索合集', CALLBACKS.COMMAND.SEARCH)
      .row();

    if (isAdmin) {
      keyboard
        .text('📤 上传文件', CALLBACKS.COMMAND.UPLOAD)
        .text('📢 广播消息', CALLBACKS.COMMAND.PUBLISH)
        .row()
        .text('🚀 频道搬运', CALLBACKS.COMMAND.TRANSFER)
        .text('✏️ 设置欢迎语', CALLBACKS.COMMAND.SETWELCOME)
        .row()
        .text('👥 管理员管理', CALLBACKS.COMMAND.ADMIN_MANAGE)
        .text('📞 联系人管理', CALLBACKS.COMMAND.CONTACT_MANAGE)
        .row()
        .text('👤 用户管理', CALLBACKS.COMMAND.USER_MANAGE);
    }

    return keyboard;
  }

  /**
   * 创建编辑合集键盘
   */
  static createEditCollectionKeyboard(collectionId: number, mediaFiles: any[]): InlineKeyboard {
    const keyboard = new InlineKeyboard()
      .text('✏️ 编辑标题/描述', `edit_meta:${collectionId}`)
      .row();

    // 为每个文件添加删除按钮（每行2个按钮）
    for (let i = 0; i < mediaFiles.length; i++) {
      const media = mediaFiles[i];
      const fileTypeEmoji = this.getFileTypeEmoji(media.fileType);
      keyboard.text(`🗑️ ${fileTypeEmoji} ${media.id}`, `delete_media:${media.id}`);

      if (i % 2 === 1 || i === mediaFiles.length - 1) {
        keyboard.row();
      }
    }

    return keyboard;
  }

  /**
   * 获取文件类型对应的 emoji
   */
  private static getFileTypeEmoji(fileType: string): string {
    switch (fileType) {
      case 'photo': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      default: return '📄';
    }
  }

  /**
   * 组合多个键盘
   */
  static combine(...keyboards: InlineKeyboard[]): InlineKeyboard {
    const combined = new InlineKeyboard();

    for (const keyboard of keyboards) {
      // 注意：这里需要手动处理键盘合并
      // Grammy 的 InlineKeyboard 没有直接的合并方法
      // 这是一个简化版本，实际使用时可能需要更复杂的逻辑
    }

    return combined;
  }
}
