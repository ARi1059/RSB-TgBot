/**
 * 配置管理器
 * 统一管理环境变量，提供类型安全的访问和验证
 */

export class Config {
  // Bot 配置
  static readonly BOT_TOKEN = process.env.BOT_TOKEN!;
  static readonly BOT_USERNAME = process.env.BOT_USERNAME!;

  // 管理员配置
  static readonly ADMIN_IDS = this.parseAdminIds();
  static readonly ADMIN_CONTACT = process.env.ADMIN_CONTACT || '@admin';

  // 数据库配置
  static readonly DATABASE_URL = process.env.DATABASE_URL!;

  // 频道配置
  static readonly PUBLIC_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID;
  static readonly PRIVATE_CHANNEL_ID = process.env.PRIVATE_CHANNEL_ID;

  // UserBot 配置
  static readonly USERBOT_API_ID = process.env.USERBOT_API_ID
    ? parseInt(process.env.USERBOT_API_ID)
    : undefined;
  static readonly USERBOT_API_HASH = process.env.USERBOT_API_HASH;
  static readonly USERBOT_SESSION = process.env.USERBOT_SESSION;

  // 代理配置
  static readonly HTTP_PROXY = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  // 环境配置
  static readonly NODE_ENV = process.env.NODE_ENV || 'development';
  static readonly IS_DEVELOPMENT = this.NODE_ENV === 'development';
  static readonly IS_PRODUCTION = this.NODE_ENV === 'production';

  /**
   * 解析管理员 ID 列表
   */
  private static parseAdminIds(): number[] {
    const ids = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
    return ids.filter(id => !isNaN(id));
  }

  /**
   * 刷新管理员 ID 列表（用于运行时更新）
   */
  static refreshAdminIds(): number[] {
    const ids = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
    return ids.filter(id => !isNaN(id));
  }

  /**
   * 验证必需的配置项
   * @throws Error 如果缺少必需的配置
   */
  static validate(): void {
    const errors: string[] = [];

    // 必需的配置项
    if (!this.BOT_TOKEN) {
      errors.push('BOT_TOKEN is required');
    }

    if (!this.BOT_USERNAME) {
      errors.push('BOT_USERNAME is required');
    }

    if (!this.DATABASE_URL) {
      errors.push('DATABASE_URL is required');
    }

    if (this.ADMIN_IDS.length === 0) {
      errors.push('ADMIN_IDS is required and must contain at least one valid ID');
    }

    // UserBot 配置验证（如果配置了任何一项，则全部必需）
    const hasAnyUserbotConfig = this.USERBOT_API_ID || this.USERBOT_API_HASH || this.USERBOT_SESSION;
    if (hasAnyUserbotConfig) {
      if (!this.USERBOT_API_ID) {
        errors.push('USERBOT_API_ID is required when UserBot is configured');
      }
      if (!this.USERBOT_API_HASH) {
        errors.push('USERBOT_API_HASH is required when UserBot is configured');
      }
      if (!this.USERBOT_SESSION) {
        errors.push('USERBOT_SESSION is required when UserBot is configured');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
  }

  /**
   * 获取配置摘要（用于日志）
   */
  static getSummary(): string {
    const hasUserbot = !!(this.USERBOT_API_ID || this.USERBOT_API_HASH || this.USERBOT_SESSION);

    return [
      `Environment: ${this.NODE_ENV}`,
      `Bot: @${this.BOT_USERNAME}`,
      `Admin IDs: ${this.ADMIN_IDS.join(', ')}`,
      `Admin Contact: ${this.ADMIN_CONTACT}`,
      `Proxy: ${this.HTTP_PROXY || 'None'}`,
      `Public Channel: ${this.PUBLIC_CHANNEL_ID || 'Not configured'}`,
      `Private Channel: ${this.PRIVATE_CHANNEL_ID || 'Not configured'}`,
      `UserBot: ${hasUserbot ? 'Configured' : 'Not configured'}`,
    ].join('\n');
  }
}

// 辅助函数：检查是否配置了 UserBot
function hasAnyUserbotConfig(): boolean {
  return !!(Config.USERBOT_API_ID || Config.USERBOT_API_HASH || Config.USERBOT_SESSION);
}
