import { Bot, Context, session } from 'grammy';
import { conversations, createConversation, ConversationFlavor } from '@grammyjs/conversations';

export interface SessionData {
  uploadingFiles?: Array<{
    fileId: string;
    uniqueFileId: string;
    fileType: string;
  }>;
  editCollectionId?: number;
}

export type MyContext = Context & ConversationFlavor;

/**
 * 配置会话中间件
 */
export function setupSession(bot: Bot<MyContext>) {
  // 使用内存存储会话数据
  bot.use(session({
    initial: (): SessionData => ({}),
  }));

  // 启用 conversations 插件
  bot.use(conversations());
}
