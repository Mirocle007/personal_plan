import { Flame, CalendarClock, CalendarDays, Leaf } from 'lucide-react';
import type { ProjectDTO, TaskDTO } from '../../../types';
import { dueKey, isDone, todayKey } from '../../../constants';
import TaskRow from '../TaskRow';

interface QuadrantViewProps {
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
}

type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';

const QUADRANT_META: Record<
  Quadrant,
  { label: string; desc: string; icon: typeof Flame; ring: string; badge: string }
> = {
  q1: {
    label: '立即处理',
    desc: '重要且紧急',
    icon: Flame,
    ring: 'border-rose-500/30',
    badge: 'bg-rose-500/10 text-rose-500'
  },
  q2: {
    label: '计划安排',
    desc: '重要不紧急',
    icon: CalendarDays,
    ring: 'border-indigo-500/30',
    badge: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
  },
  q3: {
    label: '尽快完成',
    desc: '紧急不重要',
    icon: CalendarClock,
    ring: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  q4: {
    label: '有空再做',
    desc: '不紧急不重要',
    icon: Leaf,
    ring: 'border-line',
    badge: 'bg-surface-3 text-t3'
  }
};

/** 落格规则：紧急 = 今天或已逾期到期；重要 = 高优先级 */
const quadrantOf = (task: TaskDTO): Quadrant => {
  const important = task.priority === '高';
  const urgent = task.dueDate != null && dueKey(task.dueDate)! <= todayKey();
  if (important && urgent) return 'q1';
  if (important) return 'q2';
  if (urgent) return 'q3';
  return 'q4';
};

export default function QuadrantView({ tasks, projects, onOpen, onToggle }: QuadrantViewProps) {
  const active = tasks.filter((t) => !isDone(t));
  const groups: Record<Quadrant, TaskDTO[]> = { q1: [], q2: [], q3: [], q4: [] };
  for (const t of active) groups[quadrantOf(t)].push(t);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {(Object.keys(QUADRANT_META) as Quadrant[]).map((q) => {
        const meta = QUADRANT_META[q];
        const Icon = meta.icon;
        return (
          <div key={q} className={`card border ${meta.ring} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.badge}`}>
                <Icon size={15} />
              </span>
              <div>
                <p className="text-sm font-semibold text-t1 leading-4">{meta.label}</p>
                <p className="text-xs text-t3">{meta.desc}</p>
              </div>
              <span className="ml-auto rounded-full bg-surface-3 px-1.5 text-xs text-t3">
                {groups[q].length}
              </span>
            </div>
            <div className="space-y-1.5">
              {groups[q].map((t) => (
                <TaskRow key={t.id} task={t} projects={projects} onOpen={onOpen} onToggle={onToggle} />
              ))}
              {groups[q].length === 0 && (
                <p className="py-4 text-center text-xs text-t3">暂无任务</p>
              )}
            </div>
            <p className="mt-3 text-[11px] text-t3">
              规则：紧急 = 今天或已逾期 · 重要 = 高优先级，可在详情中调整
            </p>
          </div>
        );
      })}
    </div>
  );
}
