import { createLogger } from './logger';

const logger = createLogger('Cache');

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * 内存缓存类
 * 提供简单的 TTL 缓存功能
 */
export class MemoryCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private ttl: number;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * @param ttlMs 缓存过期时间（毫秒）
   */
  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取缓存
   * @returns 缓存数据，如果不存在或已过期则返回 null
   */
  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 启动定期清理过期缓存
   * @param intervalMs 清理间隔（毫秒）
   */
  startCleanup(intervalMs: number = 60000): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
      }
    }, intervalMs);

    logger.info(`Cache cleanup started (interval: ${intervalMs}ms)`);
  }

  /**
   * 停止定期清理
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('Cache cleanup stopped');
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

/**
 * 创建缓存实例的工厂函数
 */
export function createCache<T>(ttlMs: number = 5 * 60 * 1000): MemoryCache<T> {
  return new MemoryCache<T>(ttlMs);
}
