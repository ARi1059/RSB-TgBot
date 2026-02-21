import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createLogger } from '../utils/logger';
import sessionPool from '../services/sessionPool';

const logger = createLogger('UserBotClient');

// 客户端池：sessionId -> TelegramClient
const clientPool = new Map<number, TelegramClient>();

/**
 * 获取或创建指定 session 的客户端
 */
export async function getClientBySessionId(sessionId: number): Promise<TelegramClient> {
  // 检查是否已有连接的客户端
  const existingClient = clientPool.get(sessionId);
  if (existingClient && existingClient.connected) {
    return existingClient;
  }

  // 获取 session 信息
  const sessionInfo = await sessionPool.getSession(sessionId);
  if (!sessionInfo) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (!sessionInfo.isActive) {
    throw new Error(`Session ${sessionId} is not active`);
  }

  // 创建新客户端
  const session = new StringSession(sessionInfo.sessionString);
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

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

  const client = new TelegramClient(
    session,
    sessionInfo.apiId,
    sessionInfo.apiHash,
    clientOptions
  );

  logger.info(`Connecting session ${sessionId} (${sessionInfo.name})...`);
  await client.connect();

  if (!client.connected) {
    throw new Error(`Failed to connect session ${sessionId}`);
  }

  logger.info(`Session ${sessionId} (${sessionInfo.name}) connected successfully`);

  // 保存到客户端池
  clientPool.set(sessionId, client);

  // 标记为正在使用
  await sessionPool.markSessionInUse(sessionId);

  return client;
}

/**
 * 获取可用的 UserBot 客户端（自动选择最佳 session）
 */
export async function getUserBotClient(): Promise<TelegramClient> {
  // 优先使用环境变量配置的默认 session（向后兼容）
  const defaultApiId = parseInt(process.env.USERBOT_API_ID || '');
  const defaultApiHash = process.env.USERBOT_API_HASH || '';
  const defaultSessionString = process.env.USERBOT_SESSION || '';

  if (defaultApiId && defaultApiHash && defaultSessionString) {
    logger.info('Using default session from environment variables');

    // 检查是否已有连接的默认客户端
    const existingClient = clientPool.get(0);
    if (existingClient && existingClient.connected) {
      return existingClient;
    }

    // 创建默认客户端
    const session = new StringSession(defaultSessionString);
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

    const clientOptions: any = {
      connectionRetries: 5,
    };

    if (proxyUrl) {
      logger.info(`Using proxy: ${proxyUrl}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      clientOptions.proxy = {
        socksType: 5,
        ip: agent.proxy.hostname,
        port: parseInt(agent.proxy.port || '1080'),
      };
    }

    const client = new TelegramClient(session, defaultApiId, defaultApiHash, clientOptions);

    logger.info('Connecting to Telegram UserBot (default)...');
    await client.connect();

    if (!client.connected) {
      throw new Error('Failed to connect UserBot client');
    }

    logger.info('UserBot client connected successfully (default)');
    clientPool.set(0, client);

    return client;
  }

  // 从 session 池中获取可用的 session
  const sessionInfo = await sessionPool.getAvailableSession();
  if (!sessionInfo) {
    throw new Error('No available session found. Please add a session first.');
  }

  return await getClientBySessionId(sessionInfo.id);
}

/**
 * 获取可用的 session 客户端（用于搬运任务）
 * 返回 sessionId 和 client
 */
export async function getAvailableSessionClient(): Promise<{ sessionId: number; client: TelegramClient }> {
  const sessionInfo = await sessionPool.getAvailableSession();
  if (!sessionInfo) {
    throw new Error('No available session found');
  }

  const client = await getClientBySessionId(sessionInfo.id);
  return { sessionId: sessionInfo.id, client };
}

/**
 * 断开指定 session 的客户端
 */
export async function disconnectSession(sessionId: number): Promise<void> {
  const client = clientPool.get(sessionId);
  if (client) {
    await client.disconnect();
    clientPool.delete(sessionId);
    logger.info(`Session ${sessionId} disconnected`);
  }
}

/**
 * 断开所有 UserBot 客户端
 */
export async function disconnectAllSessions(): Promise<void> {
  for (const [sessionId, client] of clientPool.entries()) {
    try {
      await client.disconnect();
      logger.info(`Session ${sessionId} disconnected`);
    } catch (error) {
      logger.error(`Failed to disconnect session ${sessionId}`, error);
    }
  }
  clientPool.clear();
  logger.info('All UserBot clients disconnected');
}

/**
 * 检查 UserBot 是否已连接
 */
export function isUserBotConnected(): boolean {
  for (const client of clientPool.values()) {
    if (client.connected) {
      return true;
    }
  }
  return false;
}

/**
 * 创建新的 session（用于登录流程）
 */
export async function createNewSession(apiId: number, apiHash: string): Promise<TelegramClient> {
  const session = new StringSession('');
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  const clientOptions: any = {
    connectionRetries: 5,
  };

  if (proxyUrl) {
    logger.info(`Using proxy: ${proxyUrl}`);
    const agent = new HttpsProxyAgent(proxyUrl);
    clientOptions.proxy = {
      socksType: 5,
      ip: agent.proxy.hostname,
      port: parseInt(agent.proxy.port || '1080'),
    };
  }

  const client = new TelegramClient(session, apiId, apiHash, clientOptions);

  logger.info('Creating new session...');
  await client.connect();

  if (!client.connected) {
    throw new Error('Failed to connect for new session');
  }

  logger.info('New session client connected');
  return client;
}
