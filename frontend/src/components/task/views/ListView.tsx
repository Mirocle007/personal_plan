import type { ProjectDTO, TaskDTO } from '../../../types';
import { dueKey, isDone, todayKey } from '../../../constants';
import TaskRow from '../TaskRow';

interface ListViewProps {
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  groupBy: 'date' | 'project' | 'status';
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
}

/** 日期分组：逾期 / 今天 / 明天 / 本周 / 以后 / 无日期 */
const dateGroupOf = (task: TaskDTO): { key: string; label: string; tone?: string } => {
  if (isDone(task)) return { key: 'done', label: '已完成/已取消' };
  const key = dueKey(task.dueDate);
  if (!key) return { key: 'none', label: '无日期' };
  const today = todayKey();
  if (key < today) return { key: 'overdue', label: '逾期', tone: 'text-rose-500' };
  if (key === today) return { key: 'today', label: '今天', tone: 'text-accent' };
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmr = dueKey(tomorrow.toISOString())!;
  if (key === tmr) return { key: 'tomorrow', label: '明天' };
  const week = new Date();
  week.setDate(week.getDate() + 7);
  if (key <= dueKey(week.toISOString())!) return { key: 'week', label: '7 天内' };
  return { key: 'later', label: '以后' };
};

const GROUP_ORDER: Record<string, number> = { overdue: 0, today: 1, tomorrow: 2, week: 3, later: 4, none: 5, done: 6 };

export default function ListView({ tasks, projects, groupBy, onOpen, onToggle }: ListViewProps) {
  const groups = new Map<string, { label: string; tone?: string; items: TaskDTO[]; color?: string }>();

  for (const t of tasks) {
    if (groupBy === 'date') {
      const g = dateGroupOf(t);
      if (!groups.has(g.key)) groups.set(g.key, { label: g.label, tone: g.tone, items: [] });
      groups.get(g.key)!.items.push(t);
    } else if (groupBy === 'project') {
      const key = t.projectId ? `p${t.projectId}` : 'none';
      const project = projects.find((p) => p.id === t.projectId);
      if (!groups.has(key))
        groups.set(key, {
          label: project?.name ?? '未关联项目',
          color: project?.color ?? undefined,
          items: []
        });
      groups.get(key)!.items.push(t);
    } else {
      if (!groups.has(t.status)) groups.set(t.status, { label: t.status, items: [] });
      groups.get(t.status)!.items.push(t);
    }
  }

  const entries = Array.from(groups.entries());
  if (groupBy === 'date') entries.sort((a, b) => (GROUP_ORDER[a[0]] ?? 9) - (GROUP_ORDER[b[0]] ?? 9));

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-6">
      {entries.map(([key, group]) => (
        <section key={key}>
          <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${group.tone ?? 'text-t2'}`}>
            {group.color && (
              <span className="h-2 w-2 rounded-full" style={{ background: group.color }} />
            )}
            {group.label}
            <span className="rounded-full bg-surface-3 px-1.5 text-xs font-normal text-t3">
              {group.items.length}
            </span>
          </h3>
          <div className="space-y-1.5">
            {group.items.map((t) => (
              <TaskRow key={t.id} task={t} projects={projects} onOpen={onOpen} onToggle={onToggle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
