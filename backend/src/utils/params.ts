import { ApiError } from '../middleware/errorHandler';
import { Request } from 'express';

/** Express 5 的 params 类型为 string|string[]，这里统一取字符串 */
export const param = (req: Request, name: string): string => {
  const v = req.params[name];
  return (Array.isArray(v) ? v[0] : v) ?? '';
};

/** 取整型路径参数，不合法直接抛 400 */
export const paramInt = (req: Request, name: string): number => {
  const n = Number(param(req, name));
  if (!Number.isInteger(n)) throw new ApiError(400, `参数 ${name} 不合法`);
  return n;
};
