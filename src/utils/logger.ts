/**
 * 日志工具类
 */
class Logger {
  private prefix: string;

  constructor(prefix: string = 'Bot') {
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.prefix}] ${message}`;
  }

  info(message: string): void {
    console.log(this.formatMessage('INFO', message));
  }

  error(message: string, error?: any): void {
    console.error(this.formatMessage('ERROR', message));
    if (error) {
      if (error instanceof Error) {
        console.error(`Stack: ${error.stack}`);
      } else {
        console.error('Details:', JSON.stringify(error, null, 2));
      }
    }
  }

  warn(message: string): void {
    console.warn(this.formatMessage('WARN', message));
  }

  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message));
    }
  }
}

// 全局 Logger 实例缓存
const loggerCache = new Map<string, Logger>();

/**
 * 创建或获取 Logger 实例（工厂方法）
 * @param prefix 日志前缀（模块名）
 * @returns Logger 实例
 */
export function createLogger(prefix: string): Logger {
  if (!loggerCache.has(prefix)) {
    loggerCache.set(prefix, createLogger(prefix));
  }
  return loggerCache.get(prefix)!;
}

/**
 * 默认 Logger 实例
 */
export const defaultLogger = createLogger('App');

export default Logger;
