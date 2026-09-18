import { Op } from 'sequelize';
import Task from '../models/Task';
import Project from '../models/Project';
import { asyncHandler } from '../middleware/errorHandler';
import { Request, Response } from 'express';

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** 仪表盘一次性聚合：今日/逾期/即将到期、统计卡、近 7 天完成趋势、项目进度 */
export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600 * 1000 - 1);
  const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 3600 * 1000);

  const tasks = await Task.findAll({ include: [{ model: Project, attributes: ['id', 'name', 'color'] }] });

  const isActive = (t: Task) => t.status !== '已完成' && t.status !== '已取消';
  const dueOn = (t: Task, from: Date, to: Date) =>
    t.dueDate != null && t.dueDate >= from && t.dueDate <= to;

  const todayTasks = tasks.filter((t) => isActive(t) && dueOn(t, todayStart, todayEnd));
  const overdueTasks = tasks.filter(
    (t) => isActive(t) && t.dueDate != null && t.dueDate < todayStart
  );
  const upcomingTasks = tasks
    .filter((t) => isActive(t) && dueOn(t, new Date(todayEnd.getTime() + 1), weekEnd))
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
    .slice(0, 10);

  // 近 7 天每日完成趋势
  const trend: { date: string; label: string; completed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(todayStart, -i);
    const key = dayKey(d);
    trend.push({
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      completed: tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length
    });
  }

  // 项目进度
  const projects = await Project.findAll({ order: [['createdAt', 'ASC']] });
  const projectProgress = projects.map((p) => {
    const list = tasks.filter((t) => t.projectId === p.id);
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      total: list.length,
      done: list.filter((t) => t.status === '已完成').length,
      inProgress: list.filter((t) => t.status === '进行中').length
    };
  });

  res.json({
    today: todayTasks,
    overdue: overdueTasks,
    upcoming: upcomingTasks,
    stats: {
      todayCount: todayTasks.length,
      overdueCount: overdueTasks.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === '已完成').length,
      inProgressTasks: tasks.filter((t) => t.status === '进行中').length,
      totalProjects: projects.length
    },
    trend,
    projects: projectProgress
  });
});
