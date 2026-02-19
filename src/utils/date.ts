/**
 * 日期工具函数
 * 处理时区相关的日期操作
 */

/**
 * 获取北京时间（UTC+8）
 * @returns 北京时间的 Date 对象（内部使用 UTC 时间戳）
 */
export function getBeijingTime(): Date {
  // 直接使用当前 UTC 时间
  return new Date();
}

/**
 * 获取北京时间的日期字符串（YYYY-MM-DD）
 * @returns 格式化的日期字符串
 */
export function getBeijingDateString(): string {
  // 使用 UTC+8 时区格式化
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return beijingTime.toISOString().split('T')[0];
}

/**
 * 获取 N 天前的北京时间（当天的开始时间 00:00:00）
 * @param days 天数
 * @returns Date 对象，表示北京时间当天 00:00:00（内部是 UTC 时间戳）
 */
export function getBeijingTimeBeforeDays(days: number): Date {
  // 获取北京时间的今天
  const now = new Date();
  const beijingNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));

  // 计算 N 天前的日期字符串
  beijingNow.setDate(beijingNow.getDate() - days);
  const dateStr = beijingNow.toISOString().split('T')[0];

  // 创建该日期的北京时间 00:00:00
  return new Date(dateStr + 'T00:00:00+08:00');
}

/**
 * 获取北京时间当天的结束时间（23:59:59）
 * @returns Date 对象，表示北京时间当天 23:59:59（内部是 UTC 时间戳）
 */
export function getBeijingEndOfDay(): Date {
  // 获取北京时间的今天日期字符串
  const dateStr = getBeijingDateString();

  // 创建该日期的北京时间 23:59:59
  return new Date(dateStr + 'T23:59:59.999+08:00');
}

/**
 * 将北京时间转换为 UTC 时间
 * @param beijingTime 北京时间
 * @returns UTC 时间
 */
export function beijingToUTC(beijingTime: Date): Date {
  return new Date(beijingTime.getTime() - (8 * 60 * 60 * 1000));
}
