import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('TransferService');

export interface TransferTaskData {
  userId: bigint;
  sourceChannel: string;
  title: string;
  description?: string;
  config: string; // JSON格式的完整配置
}

export interface TransferTaskUpdate {
  status?: string;
  totalScanned?: number;
  totalMatched?: number;
  totalTransferred?: number;
  lastMessageId?: number;
  batchNumber?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 创建搬运任务
 */
export async function createTransferTask(data: TransferTaskData) {
  logger.info(`Creating transfer task for user ${data.userId}`);

  const task = await prisma.transferTask.create({
    data: {
      userId: data.userId,
      sourceChannel: data.sourceChannel,
      title: data.title,
      description: data.description,
      config: data.config,
      status: 'pending',
    },
  });

  logger.info(`Transfer task created: ${task.id}`);
  return task;
}

/**
 * 更新搬运任务
 */
export async function updateTransferTask(taskId: number, update: TransferTaskUpdate) {
  logger.debug(`Updating transfer task ${taskId}`);

  const task = await prisma.transferTask.update({
    where: { id: taskId },
    data: update,
  });

  return task;
}

/**
 * 获取搬运任务
 */
export async function getTransferTask(taskId: number) {
  return await prisma.transferTask.findUnique({
    where: { id: taskId },
  });
}

/**
 * 获取用户的活跃任务
 */
export async function getActiveTask(userId: bigint) {
  return await prisma.transferTask.findFirst({
    where: {
      userId,
      status: {
        in: ['pending', 'running', 'paused'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * 获取用户的所有任务
 */
export async function getUserTasks(userId: bigint, limit: number = 10) {
  return await prisma.transferTask.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * 标记任务为运行中
 */
export async function markTaskAsRunning(taskId: number) {
  return await updateTransferTask(taskId, {
    status: 'running',
    startedAt: new Date(),
  });
}

/**
 * 标记任务为暂停
 */
export async function markTaskAsPaused(taskId: number, lastMessageId?: number) {
  return await updateTransferTask(taskId, {
    status: 'paused',
    lastMessageId,
  });
}

/**
 * 标记任务为完成
 */
export async function markTaskAsCompleted(taskId: number) {
  return await updateTransferTask(taskId, {
    status: 'completed',
    completedAt: new Date(),
  });
}

/**
 * 标记任务为失败
 */
export async function markTaskAsFailed(taskId: number, errorMessage: string) {
  return await updateTransferTask(taskId, {
    status: 'failed',
    errorMessage,
    completedAt: new Date(),
  });
}

/**
 * 增量更新任务进度
 */
export async function incrementTaskProgress(
  taskId: number,
  scanned: number = 0,
  matched: number = 0,
  transferred: number = 0,
  lastMessageId?: number
) {
  const task = await getTransferTask(taskId);
  if (!task) {
    throw new Error(`Transfer task ${taskId} not found`);
  }

  return await updateTransferTask(taskId, {
    totalScanned: task.totalScanned + scanned,
    totalMatched: task.totalMatched + matched,
    totalTransferred: task.totalTransferred + transferred,
    lastMessageId: lastMessageId ?? task.lastMessageId,
  });
}

/**
 * 清理旧任务（保留最近30天）
 */
export async function cleanupOldTasks() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.transferTask.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
      status: {
        in: ['completed', 'failed'],
      },
    },
  });

  logger.info(`Cleaned up ${result.count} old transfer tasks`);
  return result;
}

export default {
  createTransferTask,
  updateTransferTask,
  getTransferTask,
  getActiveTask,
  getUserTasks,
  markTaskAsRunning,
  markTaskAsPaused,
  markTaskAsCompleted,
  markTaskAsFailed,
  incrementTaskProgress,
  cleanupOldTasks,
};
