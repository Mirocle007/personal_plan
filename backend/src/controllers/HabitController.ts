import { Op } from 'sequelize';
import Habit from '../models/Habit';
import HabitRecord from '../models/HabitRecord';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { HABIT_FREQUENCIES } from '../constants';
import { Request, Response } from 'express';
import { paramInt } from '../utils/params';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 本周的周一 */
const mondayOf = (d: Date) => {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (c.getDay() + 6) % 7; // 周一=0
  c.setDate(c.getDate() - day);
  return c;
};

/** 连续打卡天数：daily 按天；weekly 按每周达成次数 */
export const calcStreak = (dates: Set<string>, frequency: string, weeklyTarget: number | null) => {
  if (frequency === 'daily') {
    let streak = 0;
    const cursor = new Date();
    if (!dates.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1); // 今天还没打不算断
    while (dates.has(fmt(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
  const target = weeklyTarget ?? 1;
  const weekCounts = new Map<string, number>();
  for (const d of dates) {
    const key = fmt(mondayOf(new Date(`${d}T12:00:00`)));
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }
  let streak = 0;
  const cursor = mondayOf(new Date());
  if ((weekCounts.get(fmt(cursor)) ?? 0) < target) cursor.setDate(cursor.getDate() - 7);
  while ((weekCounts.get(fmt(cursor)) ?? 0) >= target) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

/** GET /api/habits —— 列表附带最近 60 天打卡记录、连续天数、今日打卡态 */
export const listHabits = asyncHandler(async (_req: Request, res: Response) => {
  const habits = await Habit.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] });
  const since = fmt(new Date(Date.now() - 60 * 24 * 3600 * 1000));
  const records = await HabitRecord.findAll({ where: { date: { [Op.gte]: since } } });

  const recordsByHabit = new Map<number, Set<string>>();
  for (const r of records) {
    if (!recordsByHabit.has(r.habitId)) recordsByHabit.set(r.habitId, new Set());
    recordsByHabit.get(r.habitId)!.add(r.date);
  }

  const today = fmt(new Date());
  const result = habits.map((h) => {
    const dates = recordsByHabit.get(h.id) ?? new Set<string>();
    const last7: { date: string; checked: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = fmt(d);
      last7.push({ date: key, checked: dates.has(key) });
    }
    return {
      ...h.toJSON(),
      todayChecked: dates.has(today),
      streak: calcStreak(dates, h.frequency, h.weeklyTarget),
      last7,
      totalChecked: dates.size
    };
  });
  res.json(result);
});

const extractHabitPayload = (body: Record<string, unknown>, partial: boolean) => {
  const payload: Record<string, unknown> = {};
  if (!partial || body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ApiError(400, '习惯名称不能为空');
    if (name.length > 50) throw new ApiError(400, '习惯名称不能超过 50 字');
    payload.name = name;
  }
  if (body.icon !== undefined) {
    const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : '✅';
    payload.icon = Array.from(icon)[0] ?? '✅';
  }
  if (body.frequency !== undefined) {
    if (!(HABIT_FREQUENCIES as readonly string[]).includes(body.frequency as string))
      throw new ApiError(400, '频率必须是 daily 或 weekly');
    payload.frequency = body.frequency;
  }
  if (body.weeklyTarget !== undefined) {
    if (body.weeklyTarget === null || body.weeklyTarget === '') payload.weeklyTarget = null;
    else {
      const n = Number(body.weeklyTarget);
      if (!Number.isInteger(n) || n < 1 || n > 7) throw new ApiError(400, '每周目标次数必须是 1-7');
      payload.weeklyTarget = n;
    }
  }
  if (body.sortOrder !== undefined) payload.sortOrder = Number(body.sortOrder) || 0;
  return payload;
};

// POST /api/habits
export const createHabit = asyncHandler(async (req: Request, res: Response) => {
  const payload = extractHabitPayload(req.body || {}, false);
  if (payload.frequency === 'weekly' && payload.weeklyTarget == null) payload.weeklyTarget = 1;
  const habit = await Habit.create(payload as never);
  res.status(201).json(habit);
});

// PUT /api/habits/:id
export const updateHabit = asyncHandler(async (req: Request, res: Response) => {
  const habit = await Habit.findByPk(paramInt(req, 'id'));
  if (!habit) throw new ApiError(404, '习惯不存在');
  const payload = extractHabitPayload(req.body || {}, true);
  await habit.update(payload as never);
  res.json(habit);
});

// DELETE /api/habits/:id
export const deleteHabit = asyncHandler(async (req: Request, res: Response) => {
  const habit = await Habit.findByPk(paramInt(req, 'id'));
  if (!habit) throw new ApiError(404, '习惯不存在');
  await HabitRecord.destroy({ where: { habitId: habit.id } });
  await habit.destroy();
  res.json({ message: '习惯已删除' });
});

// POST /api/habits/:id/check —— 切换今日打卡
export const toggleCheck = asyncHandler(async (req: Request, res: Response) => {
  const habit = await Habit.findByPk(paramInt(req, 'id'));
  if (!habit) throw new ApiError(404, '习惯不存在');

  const today = fmt(new Date());
  const existing = await HabitRecord.findOne({ where: { habitId: habit.id, date: today } });
  let checked: boolean;
  if (existing) {
    await existing.destroy();
    checked = false;
  } else {
    await HabitRecord.create({ habitId: habit.id, date: today } as never);
    checked = true;
  }

  const dates = new Set(
    (await HabitRecord.findAll({ where: { habitId: habit.id }, attributes: ['date'] })).map((r) => r.date)
  );
  res.json({ checked, streak: calcStreak(dates, habit.frequency, habit.weeklyTarget) });
});
