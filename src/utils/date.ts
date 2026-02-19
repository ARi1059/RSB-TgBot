/**
 * 日期工具函数
 * 处理时区相关的日期操作
 */

/**
 * 获取北京时间（UTC+8）
 * @returns 北京时间的 Date 对象
 */
export function getBeijingTime(): Date {
  const now = new Date();
  // 获取 UTC 时间戳
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // 转换为北京时间（UTC+8）
  const beijingTime = new Date(utcTime + (8 * 60 * 60 * 1000));
  return beijingTime;
}

/**
 * 获取北京时间的日期字符串（YYYY-MM-DD）
 * @returns 格式化的日期字符串
 */
export function getBeijingDateString(): string {
  const beijingTime = getBeijingTime();
  return beijingTime.toISOString().split('T')[0];
}

/**
 * 获取 N 天前的北京时间（当天的开始时间 00:00:00）
 * @param days 天数
 * @returns 北京时间的 Date 对象
 */
export function getBeijingTimeBeforeDays(days: number): Date {
  const beijingTime = getBeijingTime();
  beijingTime.setDate(beijingTime.getDate() - days);
  // 设置为当天开始时间
  beijingTime.setHours(0, 0, 0, 0);
  return beijingTime;
}

/**
 * 获取北京时间当天的结束时间（23:59:59）
 * @returns 北京时间的 Date 对象
 */
export function getBeijingEndOfDay(): Date {
  const beijingTime = getBeijingTime();
  beijingTime.setHours(23, 59, 59, 999);
  return beijingTime;
}

/**
 * 将北京时间转换为 UTC 时间
 * @param beijingTime 北京时间
 * @returns UTC 时间
 */
export function beijingToUTC(beijingTime: Date): Date {
  return new Date(beijingTime.getTime() - (8 * 60 * 60 * 1000));
}
