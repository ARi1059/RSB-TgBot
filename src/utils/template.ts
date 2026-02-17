/**
 * 模板渲染工具
 * 支持占位符替换，如 {{user_first_name}}
 */

interface TemplateData {
  [key: string]: string | number | undefined;
}

/**
 * 渲染模板字符串
 * @param template 模板字符串
 * @param data 数据对象
 * @returns 渲染后的字符串
 */
export function renderTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key]?.toString() || match;
  });
}

/**
 * 支持的占位符列表
 */
export const SUPPORTED_PLACEHOLDERS = [
  'user_first_name',
  'user_last_name',
  'user_username',
  'collection_title',
  'collection_description',
  'file_count',
] as const;
