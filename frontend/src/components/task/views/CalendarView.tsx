import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ProjectDTO, TaskDTO } from '../../../types';
import { dueKey, isDone, todayKey } from '../../../constants';

interface CalendarViewProps {
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function CalendarView({ tasks, projects, onOpen }: CalendarViewProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  });

  const byDay = new Map<string, TaskDTO[]>();
  for (const t of tasks) {
    const key = dueKey(t.dueDate);
    if (!key) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(t);
  }

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const activeCount = tasks.filter((t) => !isDone(t) && t.dueDate).length;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-t1">
          {format(month, 'yyyy年M月', { locale: zhCN })}
        </h3>
        <span className="text-xs text-t3">{activeCount} 个有截止日期的任务</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setMonth(startOfMonth(new Date()))} className="btn-outline !px-2.5 !py-1 text-xs">
            今天
          </button>
          <button onClick={() => shift(-1)} className="btn-ghost !p-1.5" aria-label="上个月">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => shift(1)} className="btn-ghost !p-1.5" aria-label="下个月">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line bg-surface-2">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="py-2 text-center text-xs font-medium text-t3">
            周{w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = (byDay.get(key) ?? []).filter((t) => t.status !== '已取消');
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={`min-h-24 border-b border-r border-line p-1.5 [&:nth-child(7n)]:border-r-0 ${
                inMonth ? 'bg-surface' : 'bg-surface-2/50'
              }`}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={`text-xs ${
                    isToday(day)
                      ? 'flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white'
                      : inMonth
                        ? 'text-t2'
                        : 'text-t3/50'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const project = projects.find((p) => p.id === t.projectId);
                  const done = t.status === '已完成';
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t.id)}
                      title={t.title}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] transition hover:brightness-95 ${
                        done ? 'bg-surface-3 text-t3 line-through' : 'bg-accent-soft text-accent'
                      } ${!isDone(t) && dueKey(t.dueDate)! < todayKey() ? 'bg-rose-500/10 text-rose-500' : ''}`}
                    >
                      {project && (
                        <span
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                          style={{ background: project.color ?? '#6366f1' }}
                        />
                      )}
                      {t.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <button onClick={() => dayTasks[3] && onOpen(dayTasks[3].id)} className="px-1.5 text-[11px] text-t3 hover:text-accent">
                    +{dayTasks.length - 3} 更多
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
