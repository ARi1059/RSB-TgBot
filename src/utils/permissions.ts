/**
 * 用户权限等级
 */
export enum UserLevel {
  NORMAL = 0,    // 普通用户
  PAID = 1,      // 付费用户
  VIP = 2,       // VIP用户
}

/**
 * 内容权限等级
 */
export enum PermissionLevel {
  NORMAL = 0,    // 普通用户可查看
  PAID = 1,      // 付费用户可查看
  VIP = 2,       // VIP用户可查看
}

/**
 * 检查用户是否有权限访问内容
 * @param userLevel 用户权限等级
 * @param contentPermission 内容权限等级
 * @returns 是否有权限
 */
export function hasPermission(userLevel: UserLevel, contentPermission: PermissionLevel): boolean {
  return userLevel >= contentPermission;
}

/**
 * 检查用户是否有权限访问合集及其文件
 * @param userLevel 用户权限等级
 * @param collectionPermission 合集权限等级
 * @param filePermission 文件权限等级（可选）
 * @returns 是否有权限
 */
export function hasCollectionPermission(
  userLevel: UserLevel,
  collectionPermission: PermissionLevel,
  filePermission?: PermissionLevel
): boolean {
  // 先检查合集权限
  if (!hasPermission(userLevel, collectionPermission)) {
    return false;
  }

  // 如果提供了文件权限，再检查文件权限
  if (filePermission !== undefined) {
    return hasPermission(userLevel, filePermission);
  }

  return true;
}

/**
 * 获取用户可访问的最大权限等级
 * @param userLevel 用户权限等级
 * @returns 可访问的最大权限等级
 */
export function getMaxAccessiblePermission(userLevel: UserLevel): PermissionLevel {
  return userLevel as number as PermissionLevel;
}

/**
 * 获取用户权限等级的显示名称
 */
export function getUserLevelName(level: UserLevel): string {
  switch (level) {
    case UserLevel.NORMAL:
      return '普通用户';
    case UserLevel.PAID:
      return '付费用户';
    case UserLevel.VIP:
      return 'VIP用户';
    default:
      return '未知';
  }
}

/**
 * 获取权限等级的显示名称
 */
export function getPermissionLevelName(level: PermissionLevel): string {
  switch (level) {
    case PermissionLevel.NORMAL:
      return '普通';
    case PermissionLevel.PAID:
      return '付费';
    case PermissionLevel.VIP:
      return 'VIP';
    default:
      return '未知';
  }
}
