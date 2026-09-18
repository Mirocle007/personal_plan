import Project from '../models/Project';
import Task from '../models/Task';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { Request, Response } from 'express';
import { paramInt } from '../utils/params';

/** 项目列表（附带任务完成度统计） */
export const listProjects = asyncHandler(async (_req: Request, res: Response) => {
  const projects = await Project.findAll({ order: [['createdAt', 'ASC']] });
  const tasks = await Task.findAll({ attributes: ['projectId', 'status'] });

  const statsByProject = new Map<number, { total: number; done: number; inProgress: number }>();
  for (const t of tasks) {
    if (t.projectId == null) continue;
    const s = statsByProject.get(t.projectId) ?? { total: 0, done: 0, inProgress: 0 };
    s.total += 1;
    if (t.status === '已完成') s.done += 1;
    else if (t.status === '进行中') s.inProgress += 1;
    statsByProject.set(t.projectId, s);
  }

  const result = projects.map((p) => ({
    ...p.toJSON(),
    taskStats: statsByProject.get(p.id) ?? { total: 0, done: 0, inProgress: 0 }
  }));
  res.json(result);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await Project.findByPk(paramInt(req, 'id'));
  if (!project) throw new ApiError(404, '项目不存在');
  res.json(project);
});

const extractProjectPayload = (body: Record<string, unknown>, partial: boolean) => {
  const payload: Record<string, unknown> = {};
  if (!partial || body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ApiError(400, '项目名称不能为空');
    if (name.length > 100) throw new ApiError(400, '项目名称不能超过 100 字');
    payload.name = name;
  }
  if (body.description !== undefined) {
    payload.description =
      typeof body.description === 'string' && body.description.trim() !== '' ? body.description : null;
  }
  if (body.manager !== undefined) {
    payload.manager =
      typeof body.manager === 'string' && body.manager.trim() !== '' ? body.manager.trim() : null;
  }
  if (body.color !== undefined) {
    if (body.color === null || body.color === '') payload.color = null;
    else if (typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)) payload.color = body.color;
    else throw new ApiError(400, '颜色格式不正确');
  }
  return payload;
};

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const payload = extractProjectPayload(req.body || {}, false);
  const project = await Project.create(payload as never);
  res.status(201).json(project);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await Project.findByPk(paramInt(req, 'id'));
  if (!project) throw new ApiError(404, '项目不存在');
  const payload = extractProjectPayload(req.body || {}, true);
  await project.update(payload as never);
  res.json(project);
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await Project.findByPk(paramInt(req, 'id'));
  if (!project) throw new ApiError(404, '项目不存在');

  const taskCount = await Task.count({ where: { projectId: project.id } });
  // 项目删除后其任务保留，仅解除关联
  await Task.update({ projectId: null }, { where: { projectId: project.id } });
  await project.destroy();

  res.json({ message: '项目已删除', detachedTasks: taskCount });
});
