import { Op, Sequelize } from 'sequelize';
import Task from '../models/Task';
import Project from '../models/Project';
import SubTask from '../models/SubTask';
import ProgressUpdate from '../models/ProgressUpdate';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants';
import { Request, Response } from 'express';
import { paramInt } from '../utils/params';

const PRIORITY_ORDER = Sequelize.literal(
  `CASE Task.priority WHEN '高' THEN 0 WHEN '中' THEN 1 WHEN '低' THEN 2 ELSE 3 END`
);

/** 截止日期解析：纯日期字符串按本地时间正午存库，避免时区偏移导致跨天 */
const parseDueDate = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const date = new Date(value as string);
  if (isNaN(date.getTime())) throw new ApiError(400, '截止日期格式不正确');
  return date;
};

const sanitizeTags = (value: unknown): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ApiError(400, '标签必须是字符串数组');
  const tags = value
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
  return Array.from(new Set(tags));
};

/** 从请求体提取并校验任务字段；partial 模式只校验出现过的字段 */
const extractTaskPayload = (body: Record<string, unknown>, partial: boolean) => {
  const payload: Record<string, unknown> = {};

  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new ApiError(400, '任务标题不能为空');
    if (title.length > 200) throw new ApiError(400, '任务标题不能超过 200 字');
    payload.title = title;
  }
  if (body.description !== undefined) {
    payload.description =
      typeof body.description === 'string' && body.description.trim() !== ''
        ? body.description
        : null;
  }
  if (body.dueDate !== undefined) payload.dueDate = parseDueDate(body.dueDate);
  if (body.priority !== undefined) {
    if (body.priority === null || body.priority === '') payload.priority = null;
    else if (typeof body.priority === 'string' && (TASK_PRIORITIES as readonly string[]).includes(body.priority))
      payload.priority = body.priority;
    else throw new ApiError(400, '优先级必须是：高、中、低');
  }
  if (body.status !== undefined) {
    if (typeof body.status === 'string' && (TASK_STATUSES as readonly string[]).includes(body.status))
      payload.status = body.status;
    else throw new ApiError(400, '状态必须是：未开始、进行中、待审核、已完成、已取消');
  }
  if (body.projectId !== undefined) {
    if (body.projectId === null || body.projectId === '') payload.projectId = null;
    else {
      const pid = Number(body.projectId);
      if (!Number.isInteger(pid)) throw new ApiError(400, '项目 ID 不合法');
      payload.projectId = pid;
    }
  }
  if (body.tags !== undefined) payload.tags = sanitizeTags(body.tags);
  if (body.sortOrder !== undefined) payload.sortOrder = Number(body.sortOrder) || 0;

  return payload;
};

const TASK_INCLUDE = [
  { model: Project, attributes: ['id', 'name', 'color'] },
  { model: SubTask, attributes: ['id', 'title', 'done', 'sortOrder'] }
];

// GET /api/tasks —— 支持筛选/搜索/排序
export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, priority, projectId, tag, dueFrom, dueTo } = req.query as Record<string, string>;
  const sort = (req.query.sort as string) || 'createdAt';
  const order = (req.query.order as string) === 'asc' ? 'ASC' : 'DESC';

  const where: { [key: string | symbol]: unknown } = {};
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }
  if (status) {
    const statuses = status.split(',').filter((s) => (TASK_STATUSES as readonly string[]).includes(s));
    if (statuses.length) where.status = { [Op.in]: statuses };
  }
  if (priority) {
    const priorities = priority.split(',').filter((p) => (TASK_PRIORITIES as readonly string[]).includes(p));
    if (priorities.length) where.priority = { [Op.in]: priorities };
  }
  if (projectId) {
    where.projectId = projectId === 'none' ? null : Number(projectId) || -1;
  }
  if (tag) {
    // JSON 列直接 LIKE 会被 Sequelize 按 JSON 序列化，改为显式 CAST 文本比较
    const safeTag = tag.replace(/["'\\%_]/g, '');
    where[Op.and] = [
      Sequelize.where(Sequelize.cast(Sequelize.col('tags'), 'TEXT'), {
        [Op.like]: `%"${safeTag}"%`
      })
    ];
  }
  if (dueFrom || dueTo) {
    where.dueDate = {
      ...(dueFrom ? { [Op.gte]: new Date(`${dueFrom}T00:00:00`) } : {}),
      ...(dueTo ? { [Op.lte]: new Date(`${dueTo}T23:59:59`) } : {})
    };
  }

  const orderMap: Record<string, unknown> = {
    createdAt: [['createdAt', order]],
    dueDate: [['dueDate', order]],
    status: [['status', order]],
    priority: [[PRIORITY_ORDER, order]],
    sortOrder: [['sortOrder', 'ASC']]
  };

  const tasks = await Task.findAll({
    where: where as never,
    include: TASK_INCLUDE,
    order: (orderMap[sort] as never) || orderMap.createdAt
  });

  res.json(tasks);
});

// GET /api/tasks/:id
export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findByPk(paramInt(req, 'id'), {
    include: [
      ...TASK_INCLUDE,
      { model: ProgressUpdate, separate: true, order: [['updateTime', 'DESC']] }
    ]
  });
  if (!task) throw new ApiError(404, '任务不存在');
  res.json(task);
});

// POST /api/tasks
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const payload = extractTaskPayload(req.body || {}, false);
  if (payload.projectId != null) {
    const project = await Project.findByPk(payload.projectId as number);
    if (!project) throw new ApiError(400, '关联的项目不存在');
  }
  const status = (payload.status as string) || '未开始';
  const task = await Task.create({
    ...payload,
    status,
    completedAt: status === '已完成' ? new Date() : null
  } as never);
  const full = await Task.findByPk(task.id, { include: TASK_INCLUDE });
  res.status(201).json(full);
});

// PUT /api/tasks/:id —— 状态变化时自动维护 completedAt 并写入进度记录
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findByPk(paramInt(req, 'id'));
  if (!task) throw new ApiError(404, '任务不存在');

  const payload = extractTaskPayload(req.body || {}, true);
  if (payload.projectId != null) {
    const project = await Project.findByPk(payload.projectId as number);
    if (!project) throw new ApiError(400, '关联的项目不存在');
  }

  const oldStatus = task.status;
  const newStatus = (payload.status as string) ?? oldStatus;

  if (payload.status !== undefined) {
    if (newStatus === '已完成') {
      payload.completedAt = (task.completedAt as Date | null) ?? new Date();
    } else if (oldStatus === '已完成') {
      payload.completedAt = null;
    }
  }

  await task.update(payload as never);

  if (payload.status !== undefined && newStatus !== oldStatus) {
    await ProgressUpdate.create({
      taskId: task.id,
      updateTime: new Date(),
      statusChange: newStatus,
      description: `状态由「${oldStatus}」变更为「${newStatus}」`
    } as never);
  }

  const full = await Task.findByPk(task.id, { include: TASK_INCLUDE });
  res.json(full);
});

// POST /api/tasks/:id/complete —— 勾选切换完成态
export const toggleTaskComplete = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findByPk(paramInt(req, 'id'));
  if (!task) throw new ApiError(404, '任务不存在');

  const oldStatus = task.status;
  const newStatus = oldStatus === '已完成' ? '未开始' : '已完成';
  await task.update({
    status: newStatus,
    completedAt: newStatus === '已完成' ? new Date() : null
  });
  await ProgressUpdate.create({
    taskId: task.id,
    updateTime: new Date(),
    statusChange: newStatus,
    description: `状态由「${oldStatus}」变更为「${newStatus}」`
  } as never);

  const full = await Task.findByPk(task.id, { include: TASK_INCLUDE });
  res.json(full);
});

// DELETE /api/tasks/:id —— 显式级联清理子任务与进度记录
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findByPk(paramInt(req, 'id'));
  if (!task) throw new ApiError(404, '任务不存在');

  await SubTask.destroy({ where: { taskId: task.id } });
  await ProgressUpdate.destroy({ where: { taskId: task.id } });
  await task.destroy();

  res.json({ message: '任务已删除' });
});
