import { Config } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('PermissionService');

/**
 * 权限服务
 * 统一管理权限检查逻辑
 */
export class PermissionService {
  private adminIdsCache: number[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5000; // 5秒缓存

  /**
   * 获取管理员 ID 列表（带缓存）
   */
  private getAdminIds(): number[] {
    const now = Date.now();

    // 如果缓存有效，直接返回
    if (this.adminIdsCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.adminIdsCache;
    }

    // 刷新缓存
    this.adminIdsCache = Config.refreshAdminIds();
    this.cacheTimestamp = now;

    return this.adminIdsCache;
  }

  /**
   * 检查用户是否为管理员
   * @param userId 用户 Telegram ID
   * @returns 是否为管理员
   */
  isAdmin(userId: number): boolean {
    const adminIds = this.getAdminIds();
    return adminIds.includes(userId);
  }

  /**
   * 检查用户权限等级是否满足要求
   * @param userLevel 用户权限等级
   * @param requiredLevel 要求的权限等级
   * @returns 是否满足权限要求
   */
  hasPermission(userLevel: number, requiredLevel: number): boolean {
    return userLevel >= requiredLevel;
  }

  /**
   * 获取管理员联系方式
   */
  getAdminContact(): string {
    return Config.ADMIN_CONTACT;
  }

  /**
   * 刷新管理员列表缓存
   * 用于管理员列表更新后立即生效
   */
  refreshCache(): void {
    this.adminIdsCache = null;
    this.cacheTimestamp = 0;
    logger.info('Admin IDs cache refreshed');
  }

  /**
   * 获取当前管理员数量
   */
  getAdminCount(): number {
    return this.getAdminIds().length;
  }

  /**
   * 获取管理员 ID 列表（用于显示）
   */
  getAdminIdList(): number[] {
    return [...this.getAdminIds()];
  }
}

// 导出单例
export default new PermissionService();
