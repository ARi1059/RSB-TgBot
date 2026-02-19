import { Context, NextFunction } from 'grammy';
import permissionService from '../../services/permission';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AuthMiddleware');

/**
 * 管理员权限检查中间件
 */
export async function adminOnly(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('无法识别用户身份');
    return;
  }

  const isAdmin = permissionService.isAdmin(userId);

  if (!isAdmin) {
    await ctx.reply('⚠️ 此命令仅限管理员使用');
    logger.warn(`Unauthorized access attempt by user ${userId}`);
    return;
  }

  await next();
}
