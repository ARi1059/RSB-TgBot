import { Api } from 'telegram';
import { Context } from 'grammy';
import { getUserBotClient } from './client';
import Logger from '../utils/logger';

const logger = new Logger('Transfer');

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
}

interface TransferStats {
  scanned: number;
  matched: number;
  transferred: number;
  photos: number;
  videos: number;
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
  };

  let progressMessage: any = null;

  try {
    logger.info('Starting transfer task asynchronously');

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
    progressMessage = await ctx.reply(
      '🚀 搬运中...\n\n' +
      '✅ 已扫描：0 条消息\n' +
      '🔍 匹配关键字：0 条\n' +
      '📥 已转发：0 个文件\n' +
      '⏱️ 用时：0秒'
    );

    const startTime = Date.now();

    // 发送开始接收命令给 Bot，触发 Bot 的 transferExecuteFlow 会话
    // 同时传递配置参数
    logger.info(`Sending /start_transfer_receive command to bot to start conversation...`);
    await client.sendMessage(botEntity, {
      message: `/start_transfer_receive ${JSON.stringify(config)}`,
    });

    // 等待一下让 Bot 进入会话
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 扫描频道消息，边扫描边转发
    logger.info('Starting to scan and forward messages...');

    const iterOptions: any = {
      limit: undefined, // 不限制数量
      reverse: false, // 从新到旧
    };

    // 如果是按日期搬运，设置时间范围
    if (config.mode === 'date_range' && config.dateRange) {
      iterOptions.offsetDate = Math.floor(config.dateRange.start.getTime() / 1000);
    }

    // 遍历消息
    for await (const message of client.iterMessages(channel, iterOptions)) {
      stats.scanned++;

      // 检查日期范围
      if (config.mode === 'date_range' && config.dateRange) {
        const messageDate = new Date(message.date * 1000);
        if (messageDate < config.dateRange.start || messageDate > config.dateRange.end) {
          // 如果消息早于起始日期，停止扫描
          if (messageDate < config.dateRange.start) {
            break;
          }
          continue;
        }
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

        logger.info(`✅ Forwarded message ${message.id}, total: ${stats.transferred}`);
      } catch (error) {
        logger.error(`Failed to forward message ${message.id}`, error);
      }

      // 避免触发限流
      await new Promise(resolve => setTimeout(resolve, 100));

      // 每转发 10 条消息更新一次进度
      if (stats.transferred % 10 === 0 && stats.transferred > 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        try {
          await ctx.api.editMessageText(
            progressMessage.chat.id,
            progressMessage.message_id,
            `🚀 搬运中...\n\n` +
            `✅ 已扫描：${stats.scanned} 条消息\n` +
            `🔍 匹配关键字：${stats.matched} 条\n` +
            `📥 已转发：${stats.transferred} 个文件\n` +
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

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

    await ctx.api.editMessageText(
      progressMessage.chat.id,
      progressMessage.message_id,
      '✅ 转发完成！Bot 正在创建合集...\n\n' +
      `✅ 已扫描：${stats.scanned} 条消息\n` +
      `🔍 匹配关键字：${stats.matched} 条\n` +
      `📥 已转发：${stats.transferred} 个文件\n` +
      `⏱️ 用时：${timeText}`
    );

    logger.info(`Transfer task completed and returned`);
  } catch (error) {
    logger.error('Transfer failed', error);

    if (progressMessage) {
      try {
        await ctx.api.editMessageText(
          progressMessage.chat.id,
          progressMessage.message_id,
          '❌ 搬运失败\n\n' +
          `错误信息：${error instanceof Error ? error.message : '未知错误'}\n\n` +
          `✅ 已扫描：${stats.scanned} 条消息\n` +
          `📥 已转发：${stats.transferred} 个文件`
        );
      } catch (e) {
        // 忽略
      }
    }

    throw error;
  }
}
