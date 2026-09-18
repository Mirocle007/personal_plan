// 前后端共享的业务枚举（单一事实来源）
export const TASK_STATUSES = ['未开始', '进行中', '待审核', '已完成', '已取消'] as const;
export const TASK_PRIORITIES = ['高', '中', '低'] as const;
export const HABIT_FREQUENCIES = ['daily', 'weekly'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export const DONE_STATUSES: readonly string[] = ['已完成', '已取消'];

export const PROJECT_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'
] as const;
