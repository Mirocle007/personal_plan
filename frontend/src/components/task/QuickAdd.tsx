import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CornerDownLeft, Flag, Hash, Tag as TagIcon } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { parseQuickAdd } from './parser';
import { QUICK_ADD_EVENT } from '../../events';
import type { ProjectDTO, TaskDTO } from '../../types';

interface QuickAddProps {
  projects: ProjectDTO[];
  onCreated: (task: TaskDTO) => void;
  filterProjectId?: number | null;
  filterTag?: string | null;
  autoFocus?: boolean;
}

export default function QuickAdd({ projects, onCreated, filterProjectId, filterTag, autoFocus }: QuickAddProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // 全局 N 键聚焦 / ?compose=1 自动聚焦
  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener(QUICK_ADD_EVENT, onFocus);
    if (autoFocus) setTimeout(onFocus, 100);
    return () => window.removeEventListener(QUICK_ADD_EVENT, onFocus);
  }, [autoFocus]);

  const parsed = useMemo(() => parseQuickAdd(text, projects), [text, projects]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    const p = parseQuickAdd(trimmed, projects);
    if (!p.title) {
      toast.error('请输入任务内容（可包含 日期/#项目/@标签/!优先级）');
      return;
    }
    setSubmitting(true);
    try {
      const task = await api<TaskDTO>('/tasks', {
        method: 'POST',
        body: {
          title: p.title,
          dueDate: p.dueDate,
          priority: p.priority,
          tags: p.tags,
          projectId: filterProjectId ?? p.projectId
        }
      });
      if (filterTag && !task.tags.includes(filterTag)) {
        // 当前在标签筛选下，创建时补上筛选标签便于归类
        await api<TaskDTO>(`/tasks/${task.id}`, {
          method: 'PUT',
          body: { tags: [...task.tags, filterTag] }
        });
      }
      toast.success(`已创建任务「${p.title}」`);
      setText('');
      onCreated(task);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const showPreview = text.trim().length > 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-3.5">
        <span className="text-lg leading-none text-accent">＋</span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setText('');
              inputRef.current?.blur();
            }
          }}
          placeholder="快速添加：明天 提交周报 #项目 @标签 !1，回车创建"
          className="flex-1 bg-transparent py-3 text-sm text-t1 placeholder:text-t3 outline-none"
        />
        {text && (
          <button onClick={() => setText('')} className="text-xs text-t3 hover:text-t2">
            清空
          </button>
        )}
        <button
          onClick={submit}
          disabled={!text.trim() || submitting}
          className="btn-primary !py-1.5 !px-3"
          title="回车快速创建"
        >
          <CornerDownLeft size={14} />
          添加
        </button>
      </div>

      {showPreview && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface-2 px-3.5 py-2 animate-fade-in">
          <span className="text-xs text-t3">识别结果：</span>
          <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs text-t1">{parsed.title || '（无标题）'}</span>
          {parsed.dateLabel && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-600 dark:text-sky-400">
              <CalendarDays size={11} /> {parsed.dateLabel}
            </span>
          )}
          {parsed.projectName && (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">
              <Hash size={11} /> {parsed.projectName}
            </span>
          )}
          {parsed.priority && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs text-rose-600 dark:text-rose-400">
              <Flag size={11} /> {parsed.priority}优先级
            </span>
          )}
          {parsed.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent"
            >
              <TagIcon size={11} /> {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
