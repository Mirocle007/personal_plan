import SubTask from '../models/SubTask';
import Task from '../models/Task';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { Request, Response } from 'express';
import { paramInt } from '../utils/params';

// POST /api/subtasks
export const createSubTask = asyncHandler(async (req: Request, res: Response) => {
  const { taskId, title } = req.body || {};
  const tid = Number(taskId);
  if (!Number.isInteger(tid)) throw new ApiError(400, 'taskId 不合法');
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) throw new ApiError(400, '子任务内容不能为空');

  const task = await Task.findByPk(tid);
  if (!task) throw new ApiError(404, '所属任务不存在');

  const count = await SubTask.count({ where: { taskId: tid } });
  const subTask = await SubTask.create({ taskId: tid, title: trimmed, done: false, sortOrder: count } as never);
  res.status(201).json(subTask);
});

// PUT /api/subtasks/:id
export const updateSubTask = asyncHandler(async (req: Request, res: Response) => {
  const subTask = await SubTask.findByPk(paramInt(req, 'id'));
  if (!subTask) throw new ApiError(404, '子任务不存在');

  const { title, done } = req.body || {};
  const payload: Record<string, unknown> = {};
  if (title !== undefined) {
    const trimmed = typeof title === 'string' ? title.trim() : '';
    if (!trimmed) throw new ApiError(400, '子任务内容不能为空');
    payload.title = trimmed;
  }
  if (done !== undefined) payload.done = Boolean(done);
  await subTask.update(payload as never);
  res.json(subTask);
});

// DELETE /api/subtasks/:id
export const deleteSubTask = asyncHandler(async (req: Request, res: Response) => {
  const subTask = await SubTask.findByPk(paramInt(req, 'id'));
  if (!subTask) throw new ApiError(404, '子任务不存在');
  await subTask.destroy();
  res.json({ message: '子任务已删除' });
});
