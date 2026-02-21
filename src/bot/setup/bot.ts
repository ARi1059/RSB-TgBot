import { Bot } from 'grammy';
import { config } from 'dotenv';
import { createConversation } from '@grammyjs/conversations';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createLogger } from '../../utils/logger';
import { Config } from '../../config';
import { setupSession, MyContext } from '../middlewares/session';
import { DeduplicationMiddleware } from '../middlewares/deduplication';
import { uploadFlow } from '../conversations/uploadFlow';
import { publishFlow } from '../conversations/publishFlow';
import { setWelcomeFlow } from '../conversations/setWelcomeFlow';
import { editCollectionFlow } from '../conversations/editCollectionFlow';
import { transferFlow } from '../conversations/transferFlow';
import { transferExecuteFlow } from '../conversations/transferExecuteFlow';
import { searchCollectionFlow } from '../conversations/searchCollectionFlow';
import { adminManageFlow } from '../conversations/adminManageFlow';
import { contactManageFlow } from '../conversations/contactManageFlow';
import { userManageFlow } from '../conversations/userManageFlow';
import { sessionManageFlow } from '../conversations/sessionManageFlow';

// 加载环境变量
config();

// 验证配置
try {
  Config.validate();
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

const logger = createLogger('Bot');

/**
 * 创建并配置 Bot 实例
 */
export function createBot(): { bot: Bot<MyContext>; deduplicationMiddleware: DeduplicationMiddleware } {
  // 配置代理
  const proxyUrl = Config.HTTP_PROXY;
  const botConfig: any = {
    client: {}
  };

  if (proxyUrl) {
    logger.info(`Using proxy: ${proxyUrl}`);
    const agent = new HttpsProxyAgent(proxyUrl);
    botConfig.client.baseFetchConfig = {
      agent,
      compress: true,
    };
  }

  // 创建 Bot 实例
  const bot = new Bot<MyContext>(Config.BOT_TOKEN, botConfig);

  // 配置会话
  setupSession(bot);

  // 创建请求去重中间件实例
  // 参数：500ms 防抖时间，3 次最大请求（防止快速重复点击按钮）
  const deduplicationMiddleware = new DeduplicationMiddleware(500, 3);
  bot.use(deduplicationMiddleware.middleware()); // 暂时注释掉

  // 注册会话流程
  bot.use(createConversation(uploadFlow));
  bot.use(createConversation(publishFlow));
  bot.use(createConversation(setWelcomeFlow));
  bot.use(createConversation(editCollectionFlow));
  bot.use(createConversation(transferFlow));
  bot.use(createConversation(transferExecuteFlow));
  bot.use(createConversation(searchCollectionFlow));
  bot.use(createConversation(adminManageFlow));
  bot.use(createConversation(contactManageFlow));
  bot.use(createConversation(userManageFlow));
  bot.use(createConversation(sessionManageFlow));

  // 错误处理
  bot.catch((err) => {
    logger.error('Bot error', err);
  });

  return { bot, deduplicationMiddleware };
}
