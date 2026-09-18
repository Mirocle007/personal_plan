import { Check } from 'lucide-react';
import type { ProjectDTO, TaskDTO } from '../../types';
import { formatDue, isOverdue } from '../../constants';
import { TagChip } from '../ui/Badges';

interface TaskRowProps {
  task: TaskDTO;
  projects: ProjectDTO[];
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
}

export default function TaskRow({ task, projects, onOpen, onToggle }: TaskRowProps) {
  const done = task.status === '已完成' || task.status === '已取消';
  const overdue = isOverdue(task);
  const project = projects.find((p) => p.id === task.projectId);

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 transition hover:border-accent/40 hover:shadow-sm">
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? '标记未完成' : '标记完成'}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${
          task.status === '已完成'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-t3 hover:border-accent'
        }`}
      >
        {task.status === '已完成' && <Check size={11} strokeWidth={3} />}
      </button>

      <button onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm font-medium ${done ? 'text-t3 line-through' : 'text-t1'}`}>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {task.priority && (
            <span
              className={`text-xs font-medium ${
                task.priority === '高' ? 'text-rose-500' : task.priority === '中' ? 'text-amber-500' : 'text-sky-500'
              }`}
            >
              !{task.priority === '高' ? '1' : task.priority === '中' ? '2' : '3'} {task.priority}
            </span>
          )}
          {task.dueDate && (
            <span className={`text-xs ${overdue ? 'font-medium text-rose-500' : 'text-t3'}`}>
              {formatDue(task.dueDate)}
            </span>
          )}
          {project && (
            <span className="inline-flex items-center gap-1 text-xs text-t3">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.color ?? '#6366f1' }} />
              {project.name}
            </span>
          )}
          {task.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      </button>

      <span
        className={`hidden shrink-0 rounded-md px-2 py-0.5 text-xs font-medium sm:inline ${
          done ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface-3 text-t2'
        }`}
      >
        {task.status}
      </span>
    </div>
  );
}
