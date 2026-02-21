import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('SessionPool');

export interface SessionData {
  id?: number;
  name: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
  priority?: number;
}

export interface SessionInfo {
  id: number;
  name: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
  isActive: boolean;
  isAvailable: boolean;
  floodWaitUntil: Date | null;
  lastUsedAt: Date | null;
  totalTransferred: number;
  dailyTransferred: number;
  priority: number;
  createdAt: Date;
}

/**
 * 添加新的 session 账号
 */
export async function addSession(data: SessionData): Promise<SessionInfo> {
  logger.info(`Adding new session: ${data.name}`);

  const session = await prisma.userBotSession.create({
    data: {
      name: data.name,
      apiId: data.apiId,
      apiHash: data.apiHash,
      sessionString: data.sessionString,
      priority: data.priority || 0,
    },
  });

  logger.info(`Session added: ${session.id} - ${session.name}`);
  return session as SessionInfo;
}

/**
 * 获取可用的 session（按优先级和可用性排序）
 */
export async function getAvailableSession(): Promise<SessionInfo | null> {
  const now = new Date();

  // 重置已过期的限流状态
  await prisma.userBotSession.updateMany({
    where: {
      isAvailable: false,
      floodWaitUntil: {
        lte: now,
      },
    },
    data: {
      isAvailable: true,
      floodWaitUntil: null,
    },
  });

  // 获取可用的 session（按优先级降序，最后使用时间升序）
  const session = await prisma.userBotSession.findFirst({
    where: {
      isActive: true,
      isAvailable: true,
      OR: [
        { floodWaitUntil: null },
        { floodWaitUntil: { lte: now } },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { lastUsedAt: 'asc' },
    ],
  });

  if (session) {
    logger.info(`Selected session: ${session.id} - ${session.name}`);
  } else {
    logger.warn('No available session found');
  }

  return session as SessionInfo | null;
}

/**
 * 标记 session 为正在使用
 */
export async function markSessionInUse(sessionId: number): Promise<void> {
  await prisma.userBotSession.update({
    where: { id: sessionId },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

/**
 * 标记 session 被限流
 */
export async function markSessionFloodWait(
  sessionId: number,
  waitSeconds: number
): Promise<void> {
  const floodWaitUntil = new Date(Date.now() + waitSeconds * 1000);

  logger.warn(`Session ${sessionId} flood wait until ${floodWaitUntil.toISOString()}`);

  await prisma.userBotSession.update({
    where: { id: sessionId },
    data: {
      isAvailable: false,
      floodWaitUntil,
    },
  });
}

/**
 * 增加 session 的转发计数
 */
export async function incrementSessionTransfer(sessionId: number, count: number = 1): Promise<void> {
  const session = await prisma.userBotSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // 检查是否需要重置每日计数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastResetDate = new Date(session.lastResetDate);
  lastResetDate.setHours(0, 0, 0, 0);

  const needsReset = today.getTime() > lastResetDate.getTime();

  await prisma.userBotSession.update({
    where: { id: sessionId },
    data: {
      totalTransferred: session.totalTransferred + count,
      dailyTransferred: needsReset ? count : session.dailyTransferred + count,
      lastResetDate: needsReset ? new Date() : session.lastResetDate,
    },
  });
}

/**
 * 获取所有 session 列表
 */
export async function getAllSessions(): Promise<SessionInfo[]> {
  const sessions = await prisma.userBotSession.findMany({
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return sessions as SessionInfo[];
}

/**
 * 获取单个 session
 */
export async function getSession(sessionId: number): Promise<SessionInfo | null> {
  const session = await prisma.userBotSession.findUnique({
    where: { id: sessionId },
  });

  return session as SessionInfo | null;
}

/**
 * 更新 session
 */
export async function updateSession(
  sessionId: number,
  data: Partial<SessionData> & { isActive?: boolean; priority?: number }
): Promise<SessionInfo> {
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.apiId !== undefined) updateData.apiId = data.apiId;
  if (data.apiHash !== undefined) updateData.apiHash = data.apiHash;
  if (data.sessionString !== undefined) updateData.sessionString = data.sessionString;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.priority !== undefined) updateData.priority = data.priority;

  const session = await prisma.userBotSession.update({
    where: { id: sessionId },
    data: updateData,
  });

  logger.info(`Session updated: ${session.id} - ${session.name}`);
  return session as SessionInfo;
}

/**
 * 删除 session
 */
export async function deleteSession(sessionId: number): Promise<void> {
  await prisma.userBotSession.delete({
    where: { id: sessionId },
  });

  logger.info(`Session deleted: ${sessionId}`);
}

/**
 * 启用/禁用 session
 */
export async function toggleSession(sessionId: number, isActive: boolean): Promise<SessionInfo> {
  const session = await prisma.userBotSession.update({
    where: { id: sessionId },
    data: { isActive },
  });

  logger.info(`Session ${sessionId} ${isActive ? 'enabled' : 'disabled'}`);
  return session as SessionInfo;
}

/**
 * 手动重置 session 的限流状态
 */
export async function resetSessionFloodWait(sessionId: number): Promise<void> {
  await prisma.userBotSession.update({
    where: { id: sessionId },
    data: {
      isAvailable: true,
      floodWaitUntil: null,
    },
  });

  logger.info(`Session ${sessionId} flood wait reset`);
}

/**
 * 获取 session 统计信息
 */
export async function getSessionStats() {
  const total = await prisma.userBotSession.count();
  const active = await prisma.userBotSession.count({
    where: { isActive: true },
  });
  const available = await prisma.userBotSession.count({
    where: {
      isActive: true,
      isAvailable: true,
    },
  });
  const floodWaiting = await prisma.userBotSession.count({
    where: {
      isAvailable: false,
      floodWaitUntil: {
        gt: new Date(),
      },
    },
  });

  return {
    total,
    active,
    available,
    floodWaiting,
  };
}

export default {
  addSession,
  getAvailableSession,
  markSessionInUse,
  markSessionFloodWait,
  incrementSessionTransfer,
  getAllSessions,
  getSession,
  updateSession,
  deleteSession,
  toggleSession,
  resetSessionFloodWait,
  getSessionStats,
};
