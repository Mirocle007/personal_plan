import ProgressUpdate from '../models/ProgressUpdate';
import Task from '../models/Task';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { TASK_STATUSES } from '../constants';
import { Request, Response } from 'express';
import { paramInt } from '../utils/params';

// GET /api/progress-updates/task/:taskId
export const getTaskUpdates = asyncHandler(async (req: Request, res: Response) => {
  const updates = await ProgressUpdate.findAll({
    where: { taskId: Number(paramInt(req, 'taskId')) },
    order: [['updateTime', 'DESC']]
  });
  res.json(updates);
});

// POST /api/progress-updates —— 带状态变更时同步任务状态（completedAt 自动维护）
export const createProgressUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { taskId, description, statusChange } = req.body || {};
  const tid = Number(taskId);
  if (!Number.isInteger(tid)) throw new ApiError(400, 'taskId 不合法');

  const task = await Task.findByPk(tid);
  if (!task) throw new ApiError(404, '任务不存在');

  const desc = typeof description === 'string' ? description.trim() : '';
  if (!desc) throw new ApiError(400, '进度描述不能为空');

  if (statusChange != null && !(TASK_STATUSES as readonly string[]).includes(statusChange)) {
    throw new ApiError(400, '状态变更值不合法');
  }

  const update = await ProgressUpdate.create({
    taskId: tid,
    updateTime: new Date(),
    description: desc,
    statusChange: statusChange ?? null
  } as never);

  if (statusChange && statusChange !== task.status) {
    await task.update({
      status: statusChange,
      completedAt:
        statusChange === '已完成' ? (task.completedAt ?? new Date()) : null
    });
  }

  res.status(201).json(update);
});

// DELETE /api/progress-updates/:id
export const deleteProgressUpdate = asyncHandler(async (req: Request, res: Response) => {
  const update = await ProgressUpdate.findByPk(paramInt(req, 'id'));
  if (!update) throw new ApiError(404, '进度记录不存在');
  await update.destroy();
  res.json({ message: '进度记录已删除' });
});
