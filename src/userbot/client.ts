import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserBotClient');

let client: TelegramClient | null = null;

/**
 * 获取或创建 UserBot 客户端
 */
export async function getUserBotClient(): Promise<TelegramClient> {
  if (client && client.connected) {
    return client;
  }

  const apiId = parseInt(process.env.USERBOT_API_ID || '');
  const apiHash = process.env.USERBOT_API_HASH || '';
  const sessionString = process.env.USERBOT_SESSION || '';
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  if (!apiId || !apiHash) {
    throw new Error('USERBOT_API_ID and USERBOT_API_HASH must be set in environment variables');
  }

  const session = new StringSession(sessionString);

  const clientOptions: any = {
    connectionRetries: 5,
  };

  // 如果有代理，配置代理
  if (proxyUrl) {
    logger.info(`Using proxy: ${proxyUrl}`);
    const agent = new HttpsProxyAgent(proxyUrl);
    clientOptions.proxy = {
      socksType: 5,
      ip: agent.proxy.hostname,
      port: parseInt(agent.proxy.port || '1080'),
    };
  }

  client = new TelegramClient(session, apiId, apiHash, clientOptions);

  logger.info('Connecting to Telegram UserBot...');
  await client.connect();

  if (!client.connected) {
    throw new Error('Failed to connect UserBot client');
  }

  logger.info('UserBot client connected successfully');

  // 保存 session（如果是新登录）
  if (!sessionString) {
    const newSession = client.session.save();
    if (typeof newSession === 'string') {
      logger.info('New session created. Please save this to USERBOT_SESSION:');
      logger.info(newSession);
    }
  }

  return client;
}

/**
 * 断开 UserBot 客户端
 */
export async function disconnectUserBot(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
    logger.info('UserBot client disconnected');
  }
}

/**
 * 检查 UserBot 是否已连接
 */
export function isUserBotConnected(): boolean {
  return client !== null && (client.connected ?? false);
}
