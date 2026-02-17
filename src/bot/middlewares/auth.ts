import { Context, NextFunction } from 'grammy';
import userService from '../../services/user';
import Logger from '../../utils/logger';

const logger = new Logger('AuthMiddleware');

/**
 * 管理员权限检查中间件
 */
export async function adminOnly(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('无法识别用户身份');
    return;
  }

  const isAdmin = await userService.isAdmin(userId);

  if (!isAdmin) {
    await ctx.reply('⚠️ 此命令仅限管理员使用');
    logger.warn(`Unauthorized access attempt by user ${userId}`);
    return;
  }

  await next();
}
