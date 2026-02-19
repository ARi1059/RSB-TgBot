import { Context, NextFunction } from 'grammy';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DeduplicationMiddleware');

/**
 * 请求去重中间件
 * 防止用户快速重复点击按钮导致的重复操作
 */

interface RequestRecord {
  timestamp: number;
  count: number;
}

export class DeduplicationMiddleware {
  private requests = new Map<string, RequestRecord>();
  private readonly debounceTime: number;
  private readonly maxRequests: number;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * @param debounceTime 去重时间窗口（毫秒），默认 1000ms
   * @param maxRequests 时间窗口内最大请求次数，默认 1 次
   */
  constructor(debounceTime: number = 1000, maxRequests: number = 1) {
    this.debounceTime = debounceTime;
    this.maxRequests = maxRequests;
    this.startCleanup();
  }

  /**
   * 创建中间件函数
   */
  middleware() {
    return async (ctx: Context, next: NextFunction) => {
      const userId = ctx.from?.id;
      if (!userId) {
        return next();
      }

      // 生成请求唯一键
      const requestKey = this.generateRequestKey(ctx, userId);
      if (!requestKey) {
        return next();
      }

      // 检查是否重复请求
      if (this.isDuplicate(requestKey)) {
        logger.warn(`Duplicate request blocked: ${requestKey}`);

        // 如果是回调查询，回应用户
        if (ctx.callbackQuery) {
          await ctx.answerCallbackQuery({
            text: '⏱️ 操作过于频繁，请稍后再试',
            show_alert: false,
          });
        } else {
          await ctx.reply('⏱️ 操作过于频繁，请稍后再试');
        }

        return;
      }

      // 记录请求
      this.recordRequest(requestKey);

      // 继续处理
      await next();
    };
  }

  /**
   * 生成请求唯一键
   */
  private generateRequestKey(ctx: Context, userId: number): string | null {
    // 只对回调查询（按钮点击）做去重
    if (ctx.callbackQuery?.data) {
      return `${userId}:callback:${ctx.callbackQuery.data}`;
    }

    // 命令也做去重（防止快速重复执行命令）
    if (ctx.message?.entities?.[0]?.type === 'bot_command') {
      return `${userId}:command:${ctx.message.text}`;
    }

    // 普通文本消息不做去重（会话流程需要连续输入）
    // 其他类型不做去重
    return null;
  }

  /**
   * 检查是否为重复请求
   */
  private isDuplicate(requestKey: string): boolean {
    const record = this.requests.get(requestKey);
    if (!record) {
      return false;
    }

    const now = Date.now();
    const timeDiff = now - record.timestamp;

    // 如果在去重时间窗口内
    if (timeDiff < this.debounceTime) {
      // 检查请求次数
      if (record.count >= this.maxRequests) {
        return true;
      }
    }

    return false;
  }

  /**
   * 记录请求
   */
  private recordRequest(requestKey: string): void {
    const now = Date.now();
    const record = this.requests.get(requestKey);

    if (record && now - record.timestamp < this.debounceTime) {
      // 在时间窗口内，增加计数
      record.count++;
      record.timestamp = now;
    } else {
      // 新请求或超出时间窗口
      this.requests.set(requestKey, {
        timestamp: now,
        count: 1,
      });
    }
  }

  /**
   * 启动定期清理过期记录
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, record] of this.requests.entries()) {
        if (now - record.timestamp > this.debounceTime * 2) {
          this.requests.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug(`Cleaned ${cleanedCount} expired request records`);
      }
    }, this.debounceTime * 2);

    logger.info(`Deduplication cleanup started (interval: ${this.debounceTime * 2}ms)`);
  }

  /**
   * 停止清理
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('Deduplication cleanup stopped');
    }
  }

  /**
   * 清除所有记录
   */
  clear(): void {
    this.requests.clear();
    logger.info('All request records cleared');
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalRecords: number; debounceTime: number; maxRequests: number } {
    return {
      totalRecords: this.requests.size,
      debounceTime: this.debounceTime,
      maxRequests: this.maxRequests,
    };
  }
}

/**
 * 创建去重中间件实例
 */
export function createDeduplicationMiddleware(
  debounceTime: number = 1000,
  maxRequests: number = 1
) {
  const middleware = new DeduplicationMiddleware(debounceTime, maxRequests);
  return middleware.middleware();
}
