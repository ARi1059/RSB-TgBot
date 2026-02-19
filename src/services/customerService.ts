import { createLogger } from '../utils/logger';

const logger = createLogger('CustomerService');

interface MessageMapping {
  userId: number;
  originalMessageId: number;
  forwardedMessageId: number;
  timestamp: Date;
}

class CustomerService {
  private messageMap: Map<number, MessageMapping> = new Map();
  private readonly MESSAGE_TIMEOUT = 24 * 60 * 60 * 1000;

  constructor() {
    setInterval(() => this.cleanExpiredMappings(), 60 * 60 * 1000);
  }

  recordForwardedMessage(userId: number, originalMessageId: number, forwardedMessageId: number): void {
    this.messageMap.set(forwardedMessageId, {
      userId,
      originalMessageId,
      forwardedMessageId,
      timestamp: new Date(),
    });
  }

  getUserIdByForwardedMessage(forwardedMessageId: number): number | undefined {
    return this.messageMap.get(forwardedMessageId)?.userId;
  }

  private cleanExpiredMappings(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [messageId, mapping] of this.messageMap.entries()) {
      if (now - mapping.timestamp.getTime() > this.MESSAGE_TIMEOUT) {
        this.messageMap.delete(messageId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired message mappings`);
    }
  }

  getUserLevelText(level: number): string {
    switch (level) {
      case 0: return '普通用户';
      case 1: return '付费用户';
      case 2: return 'VIP用户';
      default: return '未知';
    }
  }
}

export default new CustomerService();
