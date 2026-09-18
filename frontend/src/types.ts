/** 与后端 JSON 结构对应的前端类型（保留 Sequelize 关联键名） */

export interface ProjectRef {
  id: number;
  name: string;
  color: string | null;
}

export interface SubTaskDTO {
  id: number;
  taskId: number;
  title: string;
  done: boolean;
  sortOrder: number;
}

export interface ProgressUpdateDTO {
  id: number;
  taskId: number;
  updateTime: string;
  description: string | null;
  statusChange: string | null;
}

export interface TaskDTO {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: '高' | '中' | '低' | null;
  projectId: number | null;
  status: string;
  tags: string[];
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  Project?: ProjectRef | null;
  SubTasks?: SubTaskDTO[];
  ProgressUpdates?: ProgressUpdateDTO[];
}

export interface ProjectDTO {
  id: number;
  name: string;
  description: string | null;
  manager: string | null;
  color: string | null;
  createdAt: string;
  taskStats?: { total: number; done: number; inProgress: number };
}

export interface HabitDTO {
  id: number;
  name: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  weeklyTarget: number | null;
  sortOrder: number;
  todayChecked: boolean;
  streak: number;
  last7: { date: string; checked: boolean }[];
  totalChecked: number;
}

export interface TrendPoint {
  date: string;
  label?: string;
  completed: number;
}

export interface DashboardDTO {
  today: TaskDTO[];
  overdue: TaskDTO[];
  upcoming: TaskDTO[];
  stats: {
    todayCount: number;
    overdueCount: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    totalProjects: number;
  };
  trend: TrendPoint[];
  projects: { id: number; name: string; color: string | null; total: number; done: number; inProgress: number }[];
}

export interface SummaryDTO {
  range: { startDate: string; endDate: string };
  createdCount: number;
  completedCount: number;
  completionRate: number | null;
  progressCount: number;
  projectStats: { name: string; color: string | null; total: number; done: number }[];
  priorityStats: Record<string, number>;
  statusStats: Record<string, number>;
  trend: TrendPoint[];
}

export interface BackupDTO {
  fileName: string;
  size: number;
  createdAt: string;
}
