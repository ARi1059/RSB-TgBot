import { nanoid } from 'nanoid';

/**
 * 生成唯一的深链 token
 * @param length token 长度，默认 8 位
 * @returns 短 hash token
 */
export function generateToken(length: number = 8): string {
  return nanoid(length);
}
