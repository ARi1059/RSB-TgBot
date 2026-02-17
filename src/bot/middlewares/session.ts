import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';

export interface SessionData {
  uploadingFiles?: Array<{
    fileId: string;
    uniqueFileId: string;
    fileType: string;
  }>;
}

/**
 * 配置会话中间件
 */
export function setupSession(bot: Bot) {
  // 使用内存存储会话数据
  bot.use(session({
    initial: (): SessionData => ({}),
  }));

  // 启用 conversations 插件
  bot.use(conversations());
}
