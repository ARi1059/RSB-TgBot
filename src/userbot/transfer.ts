import { Api } from 'telegram';
import { Context } from 'grammy';
import { getUserBotClient } from './client';
import { createLogger } from '../utils/logger';
import { TRANSFER_CONFIG } from '../constants';
import transferService from '../services/transfer';

const logger = createLogger('Transfer');

interface TransferConfig {
  mode: 'all' | 'date_range';
  sourceChannel: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  contentType: ('photo' | 'video')[];
  keyword: string;
  title: string;
  description?: string;
  userId: number;
  taskId?: number; // 任务ID（用于断点续传）
  resumeFromMessageId?: number; // 从指定消息ID恢复
}

interface TransferStats {
  scanned: number;
  matched: number;
  transferred: number;
  photos: number;
  videos: number;
  batchNumber: number;
  lastMessageId?: number;
}

/**
 * 开始搬运任务（异步执行，不阻塞调用者）
 */
export async function startTransfer(ctx: Context, config: TransferConfig) {
  const stats: TransferStats = {
    scanned: 0,
    matched: 0,
    transferred: 0,
    photos: 0,
    videos: 0,
    batchNumber: 0,
    lastMessageId: config.resumeFromMessageId,
  };

  let progressMessage: any = null;
  let taskId = config.taskId;

  try {
    logger.info('Starting transfer task asynchronously');

    // 创建或获取任务记录
    if (!taskId) {
      const task = await transferService.createTransferTask({
        userId: BigInt(config.userId),
        sourceChannel: config.sourceChannel,
        title: config.title,
        description: config.description,
        config: JSON.stringify(config),
      });
      taskId = task.id;
      logger.info(`Created new transfer task: ${taskId}`);
    } else {
      logger.info(`Resuming transfer task: ${taskId}`);
      const task = await transferService.getTransferTask(taskId);
      if (task) {
        stats.scanned = task.totalScanned;
        stats.matched = task.totalMatched;
        stats.transferred = task.totalTransferred;
        stats.batchNumber = task.batchNumber;
        stats.lastMessageId = task.lastMessageId ?? undefined;
      }
    }

    // 标记任务为运行中
    await transferService.markTaskAsRunning(taskId);

    // 打印接收到的配置日志
    logger.info(`Received config - mode=${config.mode}, channel=${config.sourceChannel}, keyword=${config.keyword}`);
    if (config.dateRange) {
      logger.info(`Received config - dateRange: start=${JSON.stringify(config.dateRange.start)} (type: ${typeof config.dateRange.start}), end=${JSON.stringify(config.dateRange.end)} (type: ${typeof config.dateRange.end})`);
      if (config.dateRange.start instanceof Date) {
        logger.info(`Received config - dateRange (Date): start=${config.dateRange.start.toISOString()} (${config.dateRange.start.getTime()}), end=${config.dateRange.end.toISOString()} (${config.dateRange.end.getTime()})`);
      }
    }

    // 连接 UserBot
    const client = await getUserBotClient();

    // 获取目标频道
    logger.info(`Fetching channel: ${config.sourceChannel}`);
    const channel = await client.getEntity(config.sourceChannel);

    if (!channel) {
      await ctx.reply('❌ 无法找到目标频道，请检查频道链接是否正确');
      return;
    }

    // 获取 Bot 信息
    const botUsername = process.env.BOT_USERNAME;
    if (!botUsername) {
      throw new Error('BOT_USERNAME not set in environment variables');
    }

    const botEntity = await client.getEntity(botUsername);

    // 发送初始进度消息
    const batchInfo = stats.batchNumber > 0 ? `📦 批次：${stats.batchNumber + 1}\n` : '';
    progressMessage = await ctx.reply(
      '🚀 搬运中...\n\n' +
      batchInfo +
      `✅ 已扫描：${stats.scanned} 条消息\n` +
      `🔍 匹配关键字：${stats.matched} 条\n` +
      `📥 已转发：${stats.transferred} 个文件\n` +
      `⏱️ 用时：0秒`
    );

    const startTime = Date.now();
    let batchStartCount = stats.transferred; // 当前批次开始时的文件数

    // 发送开始接收命令给 Bot，触发 Bot 的 transferExecuteFlow 会话
    // 同时传递配置参数
    logger.info(`Sending /start_transfer_receive command to bot to start conversation...`);
    await client.sendMessage(botEntity, {
      message: `/start_transfer_receive ${JSON.stringify(config)}`,
    });

    // 等待一下让 Bot 进入会话
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 扫描频道消息，边扫描边转发
    logger.info('Starting to scan and forward messages from newest to oldest...');

    const iterOptions: any = {
      limit: undefined, // 不限制数量
      reverse: false, // 从新到旧（最新的消息开始）
      offsetId: stats.lastMessageId, // 从上次中断的位置继续
    };

    // 检查是否达到批次限制
    const batchLimit = TRANSFER_CONFIG.BATCH_SIZE;
    let currentBatchCount = stats.transferred - batchStartCount;

    // 遍历消息（从最新到最旧）
    for await (const message of client.iterMessages(channel, iterOptions)) {
      stats.scanned++;
      stats.lastMessageId = message.id;

      // 检查批次限制（在循环开始时检查）
      if (currentBatchCount >= batchLimit) {
        logger.info(`Batch limit reached (${batchLimit} files), pausing task`);
        await transferService.markTaskAsPaused(taskId, stats.lastMessageId);

        await ctx.api.editMessageText(
          progressMessage.chat.id,
          progressMessage.message_id,
          `⏸️ 批次完成，已暂停\n\n` +
          `📦 批次：${stats.batchNumber + 1}\n` +
          `✅ 已扫描：${stats.scanned} 条消息\n` +
          `🔍 匹配关键字：${stats.matched} 条\n` +
          `📥 本批次转发：${currentBatchCount} 个文件\n` +
          `📊 总计转发：${stats.transferred} 个文件\n\n` +
          `💡 任务已保存，可稍后继续`
        );

        logger.info(`Transfer task paused at message ${stats.lastMessageId}`);
        return;
      }

      // 检查日期范围
      if (config.mode === 'date_range' && config.dateRange) {
        // message.date 是 UTC 时间戳（秒）
        const messageDate = new Date(message.date * 1000);

        // 确保日期对象有效
        const startDate = config.dateRange.start instanceof Date
          ? config.dateRange.start
          : new Date(config.dateRange.start);
        const endDate = config.dateRange.end instanceof Date
          ? config.dateRange.end
          : new Date(config.dateRange.end);

        // 打印前几条消息的日期比较日志
        if (stats.scanned <= 5) {
          logger.info(`Message ${message.id} date: ${messageDate.toISOString()} (UTC), comparing with range: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
        }

        // 如果消息晚于结束日期，跳过（继续往旧的方向扫描）
        if (messageDate > endDate) {
          if (stats.scanned <= 5) {
            logger.info(`Message date ${messageDate.toISOString()} is after end date ${endDate.toISOString()}, skipping`);
          }
          continue;
        }

        // 如果消息早于起始日期，停止扫描（因为是从新到旧，后面的消息会更旧）
        if (messageDate < startDate) {
          logger.info(`Message date ${messageDate.toISOString()} is before start date ${startDate.toISOString()}, stopping scan (scanned ${stats.scanned} messages)`);
          break;
        }

        // 此时消息在日期范围内 (startDate <= messageDate <= endDate)
      }

      // 检查是否包含媒体
      const hasPhoto = message.photo !== undefined;
      const hasVideo = message.video !== undefined;

      if (!hasPhoto && !hasVideo) {
        continue;
      }

      // 检查内容类型
      if (hasPhoto && !config.contentType.includes('photo')) {
        continue;
      }
      if (hasVideo && !config.contentType.includes('video')) {
        continue;
      }

      // 检查关键字匹配
      const messageText = message.message || message.text || '';
      if (!messageText.toLowerCase().includes(config.keyword.toLowerCase())) {
        continue;
      }

      // 匹配成功，立即转发媒体
      stats.matched++;

      try {
        // 转发消息到 Bot
        const forwardResult = await client.forwardMessages(botEntity, {
          messages: [message.id],
          fromPeer: channel,
        });

        if (message.photo) {
          stats.photos++;
        } else if (message.video) {
          stats.videos++;
        }
        stats.transferred++;
        currentBatchCount++;

        logger.info(`✅ Forwarded message ${message.id}, total: ${stats.transferred}, batch: ${currentBatchCount}`);

        // 更新数据库进度
        await transferService.incrementTaskProgress(taskId, 1, 1, 1, stats.lastMessageId);
      } catch (error: any) {
        // 记录详细的错误信息用于调试
        logger.error(`Failed to forward message ${message.id}`, {
          errorName: error.constructor?.name,
          errorMessage: error.errorMessage,
          message: error.message,
          seconds: error.seconds,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'), // 只记录前3行堆栈
        });

        // 检查是否是限流错误 - 支持多种错误格式
        const isFloodWait =
          error.errorMessage === 'FLOOD_WAIT' ||
          (error.errorMessage && error.errorMessage.includes('FLOOD_WAIT')) ||
          error.constructor?.name === 'FloodWaitError' ||
          (error.message && error.message.includes('FloodWait'));

        if (isFloodWait) {
          const waitTime = error.seconds || 60;
          logger.warn(`FloodWait detected, need to wait ${waitTime} seconds`);

          // 保存进度并暂停
          await transferService.markTaskAsPaused(taskId, stats.lastMessageId);

          const waitMinutes = Math.ceil(waitTime / 60);
          await ctx.api.editMessageText(
            progressMessage.chat.id,
            progressMessage.message_id,
            `⚠️ 触发限流，已暂停\n\n` +
            `📦 批次：${stats.batchNumber + 1}\n` +
            `✅ 已扫描：${stats.scanned} 条消息\n` +
            `📥 已转发：${stats.transferred} 个文件\n` +
            `⏳ 需等待：${waitTime} 秒 (约 ${waitMinutes} 分钟)\n\n` +
            `💡 任务已保存，请稍后继续`
          );

          return;
        }

        // 如果不是限流错误，记录但继续处理下一条消息
        logger.warn(`Skipping message ${message.id} due to error, continuing with next message`);
      }

      // 速率控制：每个文件之间的延迟
      await new Promise(resolve => setTimeout(resolve, TRANSFER_CONFIG.FORWARD_RATE));

      // 定期暂停
      if (stats.transferred % TRANSFER_CONFIG.PAUSE_AFTER_FILES === 0 && stats.transferred > 0) {
        logger.info(`Pausing for ${TRANSFER_CONFIG.PAUSE_DURATION}ms after ${TRANSFER_CONFIG.PAUSE_AFTER_FILES} files`);
        await new Promise(resolve => setTimeout(resolve, TRANSFER_CONFIG.PAUSE_DURATION));
      }

      // 长暂停
      if (stats.transferred % TRANSFER_CONFIG.LONG_PAUSE_AFTER_FILES === 0 && stats.transferred > 0) {
        logger.info(`Long pause for ${TRANSFER_CONFIG.LONG_PAUSE_DURATION}ms after ${TRANSFER_CONFIG.LONG_PAUSE_AFTER_FILES} files`);
        await new Promise(resolve => setTimeout(resolve, TRANSFER_CONFIG.LONG_PAUSE_DURATION));
      }

      // 每转发 N 条消息更新一次进度
      if (stats.transferred % TRANSFER_CONFIG.PROGRESS_UPDATE_INTERVAL === 0 && stats.transferred > 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const rate = elapsed > 0 ? Math.floor((stats.transferred - batchStartCount) / elapsed * 60) : 0;

        try {
          await ctx.api.editMessageText(
            progressMessage.chat.id,
            progressMessage.message_id,
            `🚀 搬运中...\n\n` +
            `📦 批次：${stats.batchNumber + 1} (${currentBatchCount}/${batchLimit})\n` +
            `✅ 已扫描：${stats.scanned} 条消息\n` +
            `🔍 匹配关键字：${stats.matched} 条\n` +
            `📥 已转发：${stats.transferred} 个文件\n` +
            `⚡ 速率：${rate} 文件/分钟\n` +
            `⏱️ 用时：${elapsed}秒`
          );
        } catch (error) {
          // 忽略编辑消息错误
        }
      }
    }

    logger.info(`Scan completed. Forwarded ${stats.transferred} messages`);

    // 发送完成命令给 Bot（会被 transferExecuteFlow 会话接收）
    logger.info(`Sending transfer complete command to bot...`);
    await client.sendMessage(botEntity, {
      message: `/transfer_complete`,
    });

    // 标记任务为完成
    await transferService.markTaskAsCompleted(taskId);

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

    await ctx.api.editMessageText(
      progressMessage.chat.id,
      progressMessage.message_id,
      '✅ 转发完成！Bot 正在创建合集...\n\n' +
      `📦 批次：${stats.batchNumber + 1}\n` +
      `✅ 已扫描：${stats.scanned} 条消息\n` +
      `🔍 匹配关键字：${stats.matched} 条\n` +
      `📥 已转发：${stats.transferred} 个文件\n` +
      `⏱️ 用时：${timeText}`
    );

    logger.info(`Transfer task completed and returned`);
  } catch (error) {
    logger.error('Transfer failed', error);

    // 标记任务为失败
    if (taskId) {
      await transferService.markTaskAsFailed(
        taskId,
        error instanceof Error ? error.message : '未知错误'
      );
    }

    if (progressMessage) {
      try {
        await ctx.api.editMessageText(
          progressMessage.chat.id,
          progressMessage.message_id,
          '❌ 搬运失败\n\n' +
          `错误信息：${error instanceof Error ? error.message : '未知错误'}\n\n` +
          `✅ 已扫描：${stats.scanned} 条消息\n` +
          `📥 已转发：${stats.transferred} 个文件\n\n` +
          `💡 任务已保存，可稍后重试`
        );
      } catch (e) {
        // 忽略
      }
    }

    throw error;
  }
}
