import { MyContext } from '../middlewares/session';
import { CollectionWithMedia, CollectionListItem } from '../../types/collection';
import { CollectionMessageBuilder } from '../ui/builders/CollectionMessageBuilder';
import { KeyboardFactory } from '../ui/keyboards/KeyboardFactory';
import permissionService from '../../services/permission';
import settingService from '../../services/setting';
import { renderTemplate } from '../../utils/template';

/**
 * 显示取消消息，并在下方添加返回菜单按钮
 */
export async function showCancelWithMenuButton(ctx: MyContext, cancelMessage: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // 创建返回菜单按钮
  const keyboard = KeyboardFactory.createBackToMenuKeyboard();

  // 显示取消消息和返回菜单按钮
  await ctx.reply(cancelMessage, { reply_markup: keyboard });
}

/**
 * 显示编辑合集界面
 */
export async function showEditCollectionUI(
  ctx: MyContext,
  collection: CollectionWithMedia,
  collectionId: number
): Promise<void> {
  const message = CollectionMessageBuilder.buildEditMessage(collection);
  const keyboard = KeyboardFactory.createEditCollectionKeyboard(collectionId, collection.mediaFiles);
  await ctx.reply(message, { reply_markup: keyboard });
}

/**
 * 获取文件类型对应的 emoji
 */
export function getFileTypeEmoji(fileType: string): string {
  switch (fileType) {
    case 'photo': return '🖼️';
    case 'video': return '🎥';
    case 'audio': return '🎵';
    default: return '📄';
  }
}

/**
 * 构建合集列表消息和键盘
 */
export function buildCollectionListMessage(
  collections: CollectionListItem[],
  total: number,
  page: number,
  totalPages: number,
  keyword?: string,
  isAdmin: boolean = false
): { message: string; keyboard: any } {
  // 使用 CollectionMessageBuilder 构建消息
  const message = CollectionMessageBuilder.buildListMessage({
    collections,
    total,
    page,
    totalPages,
    keyword,
    isAdmin
  });

  // 构建翻页键盘
  const keyboard = KeyboardFactory.createPaginationKeyboard({
    currentPage: page,
    totalPages,
    prefix: keyword ? 'search_page' : 'page',
    keyword
  });

  // 如果是管理员,为每个合集添加编辑和删除按钮
  if (isAdmin && collections.length > 0) {
    keyboard.row();
    for (const collection of collections) {
      keyboard.text(`✏️ ${collection.title.substring(0, 10)}`, `edit_collection:${collection.id}`);
      keyboard.text(`🗑️`, `delete_collection:${collection.id}`);
      keyboard.row();
    }
  }

  // 添加返回菜单按钮
  keyboard.row();
  keyboard.text('🏠 返回菜单', 'back_to_menu');

  return { message, keyboard };
}
