import { Op } from 'sequelize';
import Task from '../models/Task';
import Project from '../models/Project';
import ProgressUpdate from '../models/ProgressUpdate';
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

/** 汇总报告：按时间区间统计任务完成情况、项目进展、进度记录数与每日完成趋势 */
export const generateSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body || {};
  if (!startDate || !endDate) {
    res.status(400).json({ error: '开始日期和结束日期不能为空' });
    return;
  }
  const start = startOfDay(new Date(`${startDate}T00:00:00`));
  const end = new Date(new Date(`${endDate}T00:00:00`).getTime() + 24 * 3600 * 1000 - 1);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: '日期格式不正确' });
    return;
  }

  const inRange = (d: Date | null) => d != null && d >= start && d <= end;

  const allTasks = await Task.findAll({ include: [{ model: Project, attributes: ['id', 'name', 'color'] }] });
  const created = allTasks.filter((t) => inRange(t.createdAt));
  const completed = allTasks.filter((t) => inRange(t.completedAt));
  // 区间内「涉及」的任务：区间内创建或区间内完成
  const involvedIds = new Set<number>([...created, ...completed].map((t) => t.id));
  const involved = allTasks.filter((t) => involvedIds.has(t.id));

  const progressCount = await ProgressUpdate.count({
    where: { updateTime: { [Op.between]: [start, end] } }
  });

  // 项目维度统计
  const projectMap = new Map<number, { name: string; color: string | null; total: number; done: number }>();
  for (const t of involved) {
    const key = t.projectId ?? 0;
    const withProject = t as unknown as { Project?: { name: string; color: string | null } };
    const entry = projectMap.get(key) ?? {
      name: withProject.Project ? withProject.Project.name : '未关联项目',
      color: withProject.Project ? withProject.Project.color : null,
      total: 0,
      done: 0
    };
    entry.total += 1;
    if (t.status === '已完成') entry.done += 1;
    projectMap.set(key, entry);
  }

  // 优先级分布
  const priorityStats = { 高: 0, 中: 0, 低: 0, 无: 0 } as Record<string, number>;
  for (const t of involved) {
    const p = t.priority ?? '无';
    priorityStats[p] = (priorityStats[p] ?? 0) + 1;
  }

  // 状态分布
  const statusStats: Record<string, number> = {};
  for (const t of involved) statusStats[t.status] = (statusStats[t.status] ?? 0) + 1;

  // 每日完成趋势
  const trend: { date: string; completed: number }[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const key = dayKey(d);
    trend.push({
      date: key,
      completed: completed.filter((t) => t.completedAt && dayKey(t.completedAt) === key).length
    });
  }

  const createdCount = created.length;
  const completedCount = completed.length;

  res.json({
    range: { startDate, endDate },
    createdCount,
    completedCount,
    completionRate: createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : null,
    progressCount,
    projectStats: Array.from(projectMap.values()).sort((a, b) => b.total - a.total),
    priorityStats,
    statusStats,
    trend
  });
});
