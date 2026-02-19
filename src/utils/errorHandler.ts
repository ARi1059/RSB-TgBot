import Logger from './logger';

/**
 * 统一的异常处理和日志记录装饰器
 */
export function withErrorHandling(serviceName: string) {
  const logger = new Logger(serviceName);

  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        logger.debug(`${propertyKey} called with args:`, args);
        const result = await originalMethod.apply(this, args);
        logger.debug(`${propertyKey} completed successfully`);
        return result;
      } catch (error) {
        logger.error(`Error in ${propertyKey}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 统一的服务层异常处理包装器
 */
export async function executeWithErrorHandling<T>(
  serviceName: string,
  methodName: string,
  operation: () => Promise<T>
): Promise<T> {
  const logger = new Logger(serviceName);

  try {
    logger.debug(`${methodName} started`);
    const result = await operation();
    logger.debug(`${methodName} completed successfully`);
    return result;
  } catch (error) {
    logger.error(`Error in ${methodName}:`, error);
    throw error;
  }
}

/**
 * 统一的错误响应格式
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

/**
 * 创建标准化的服务错误
 */
export function createServiceError(
  code: string,
  message: string,
  details?: any
): ServiceError {
  return { code, message, details };
}

/**
 * 判断是否为服务错误
 */
export function isServiceError(error: any): error is ServiceError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}
