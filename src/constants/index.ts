/**
 * 回调数据常量
 * 统一管理所有回调查询的数据字符串
 */

export const CALLBACKS = {
  // 命令按钮
  COMMAND: {
    LIST: 'cmd:list',
    UPLOAD: 'cmd:upload',
    PUBLISH: 'cmd:publish',
    SETWELCOME: 'cmd:setwelcome',
    TRANSFER: 'cmd:transfer',
    SEARCH: 'cmd:search',
    ADMIN_MANAGE: 'cmd:admin_manage',
    CONTACT_MANAGE: 'cmd:contact_manage',
    USER_MANAGE: 'cmd:user_manage',
    SESSION_MANAGE: 'cmd:session_manage',
  },

  // 翻页
  PAGINATION: {
    PAGE: 'page:',
    SEARCH_PAGE: 'search_page:',
  },

  // 合集操作
  COLLECTION: {
    EDIT: 'edit_collection:',
    DELETE: 'delete_collection:',
    EDIT_META: 'edit_meta:',
    CONFIRM_DELETE: 'confirm_delete:',
    CANCEL_DELETE: 'cancel_delete:',
  },

  // 媒体操作
  MEDIA: {
    DELETE: 'delete_media:',
    CONFIRM_DELETE: 'confirm_delete_media:',
    CANCEL_DELETE: 'cancel_delete_media:',
  },

  // 管理员管理
  ADMIN: {
    ACTION: 'admin_action:',
    CANCEL: 'admin_cancel',
  },

  // 联系人管理
  CONTACT: {
    ACTION: 'contact_action:',
    CANCEL: 'contact_cancel',
  },

  // 用户管理
  USER: {
    LEVEL: 'user_level:',
    CANCEL: 'user_cancel',
  },

  // 推送
  PUBLISH: {
    CONFIRM: 'publish_confirm',
    CANCEL: 'publish_cancel',
  },

  // 搬运
  TRANSFER: {
    RECEIVE: 'start_transfer_receive',
    COMPLETE: 'transfer_complete',
  },
} as const;

/**
 * 消息模板常量
 */
export const MESSAGES = {
  // 错误消息
  ERROR: {
    UNKNOWN: '❌ 发生未知错误',
    UNAUTHORIZED: '❌ 仅管理员可用',
    INVALID_ID: '❌ 无效的 ID',
    NOT_FOUND: '❌ 未找到',
    OPERATION_FAILED: '❌ 操作失败，请稍后重试',
    CANCELLED: '❌ 操作已取消',
  },

  // 成功消息
  SUCCESS: {
    SAVED: '✅ 保存成功',
    DELETED: '✅ 删除成功',
    UPDATED: '✅ 更新成功',
  },

  // 提示消息
  INFO: {
    LOADING: '⏳ 处理中...',
    EMPTY_LIST: '📭 暂无数据',
  },
} as const;

/**
 * 分页配置
 */
export const PAGINATION = {
  PAGE_SIZE: 10,
  MEDIA_GROUP_LIMIT: 10,
} as const;

/**
 * 速率限制配置
 */
export const RATE_LIMIT = {
  PUBLISH_BATCH_SIZE: 30,
  PUBLISH_BATCH_DELAY: 1000, // 毫秒
  MEDIA_SEND_RETRY_DELAY: 2000, // 毫秒
  MAX_RETRIES: 3,
} as const;

/**
 * 搬运任务配置
 *
 * 速率建议：
 * - 保守模式：FORWARD_RATE: 2000 (每秒0.5个文件) - 最安全，适合长时间运行
 * - 标准模式：FORWARD_RATE: 1500 (每秒0.67个文件) - 推荐，平衡速度和安全
 * - 激进模式：FORWARD_RATE: 1000 (每秒1个文件) - 容易触发限流
 */
export const TRANSFER_CONFIG = {
  BATCH_SIZE: 500, // 每批次文件数量
  FORWARD_RATE: 1500, // 转发间隔（毫秒）- 推荐1500ms以避免频繁限流
  PAUSE_AFTER_FILES: 50, // 每转发N个文件后暂停
  PAUSE_DURATION: 15000, // 暂停时长（毫秒）- 增加到15秒
  LONG_PAUSE_AFTER_FILES: 150, // 每转发N个文件后长暂停（从200降到150）
  LONG_PAUSE_DURATION: 90000, // 长暂停时长（毫秒）- 增加到1.5分钟
  PROGRESS_UPDATE_INTERVAL: 10, // 每N个文件更新一次进度
  DB_BATCH_SIZE: 100, // 数据库批量查询大小
  MAX_DAILY_TRANSFER: 5000, // 每日最大搬运数量
  FLOOD_WAIT_MULTIPLIER: 1.2, // 限流后等待时间倍数
} as const;

/**
 * 注意：权限等级定义已统一到 utils/permissions.ts
 * 请使用 UserLevel 和 PermissionLevel 枚举
 *
 * import { UserLevel, PermissionLevel } from '../utils/permissions';
 */
