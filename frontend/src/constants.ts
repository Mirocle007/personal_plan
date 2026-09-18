import type { TaskDTO } from './types';

export const TASK_STATUSES = ['未开始', '进行中', '待审核', '已完成', '已取消'] as const;
export const TASK_PRIORITIES = ['高', '中', '低'] as const;

export const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  未开始: { color: 'text-slate-500', bg: 'bg-slate-500/10', label: '未开始' },
  进行中: { color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', label: '进行中' },
  待审核: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: '待审核' },
  已完成: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: '已完成' },
  已取消: { color: 'text-t3', bg: 'bg-slate-500/10', label: '已取消' }
};

export const PRIORITY_META: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  高: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500', label: '高' },
  中: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500', label: '中' },
  低: { color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', dot: 'bg-sky-500', label: '低' }
};

export const PROJECT_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'
];

export const HABIT_ICONS = [
  '✅', '📚', '🏃', '💪', '🧘', '💧', '🌙', '☀️',
  '✍️', '🎧', '🧹', '💰', '🥗', '😴', '🎯', '📵'
];

export const isDone = (task: TaskDTO) => task.status === '已完成' || task.status === '已取消';

/** 截止日期的本地 YYYY-MM-DD 键 */
export const dueKey = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const todayKey = (): string => dueKey(new Date().toISOString()) ?? '';

export const formatDue = (iso: string | null): string => {
  if (!iso) return '无日期';
  const key = dueKey(iso);
  const today = todayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmrKey = dueKey(tomorrow.toISOString());
  if (key === today) return '今天';
  if (key === tmrKey) return '明天';
  const d = new Date(iso);
  const overdue = key! < today;
  return `${overdue ? '逾期 · ' : ''}${d.getMonth() + 1}月${d.getDate()}日`;
};

export const isOverdue = (task: TaskDTO): boolean => {
  if (isDone(task) || !task.dueDate) return false;
  return dueKey(task.dueDate)! < todayKey();
};
