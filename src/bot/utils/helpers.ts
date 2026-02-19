import { MyContext } from '../middlewares/session';
import { CollectionWithMedia, CollectionListItem } from '../../types/collection';
import { CollectionMessageBuilder } from '../ui/builders/CollectionMessageBuilder';
import { KeyboardFactory } from '../ui/keyboards/KeyboardFactory';

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
    prefix: 'page',
    keyword
  });

  return { message, keyboard };
}
