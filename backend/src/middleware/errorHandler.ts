import { NextFunction, Request, Response } from 'express';

/** 业务错误：携带 HTTP 状态码 */
export class ApiError extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 包装 async 控制器，异常统一交给错误中间件 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** 全局错误处理中间件：兜底 500，统一返回 { error } */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Sequelize 校验错误
  const name = (err as { name?: string })?.name ?? '';
  if (name === 'SequelizeValidationError' || name === 'SequelizeUniqueConstraintError') {
    const msg = (err as { errors: { message: string }[] }).errors
      .map((e) => e.message)
      .join('；');
    res.status(400).json({ error: msg });
    return;
  }
  console.error('未处理异常:', err);
  res.status(500).json({ error: '服务器内部错误' });
};
