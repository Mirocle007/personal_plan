import { useCallback, useEffect, useState } from 'react';
import {
  X, Trash2, Check, Plus, Flag, CalendarDays, FolderKanban, History, ListChecks, ChevronRight
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { TASK_PRIORITIES, TASK_STATUSES, formatDue } from '../../constants';
import type { ProjectDTO, TaskDTO } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface TaskDetailPanelProps {
  taskId: number | null;
  projects: ProjectDTO[];
  onClose: () => void;
  onChanged: (task: TaskDTO) => void; // 列表同步
  onDeleted: (id: number) => void;
}

export default function TaskDetailPanel({ taskId, projects, onClose, onChanged, onDeleted }: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [subInput, setSubInput] = useState('');
  const [progressInput, setProgressInput] = useState('');
  const [progressStatus, setProgressStatus] = useState('');
  const [tagInput, setTagInput] = useState(false);
  const [tagText, setTagText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  const load = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const t = await api<TaskDTO>(`/tasks/${id}`);
      setTask(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载任务失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (taskId != null) {
      load(taskId);
      setTagInput(false);
    } else {
      setTask(null);
    }
  }, [taskId, load]);

  // Esc 关闭
  useEffect(() => {
    if (taskId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [taskId, onClose]);

  if (taskId == null) return null;

  /** 局部字段自动保存 */
  const patch = async (fields: Record<string, unknown>, tip?: string) => {
    if (!task) return;
    try {
      const updated = await api<TaskDTO>(`/tasks/${task.id}`, { method: 'PUT', body: fields });
      setTask(updated);
      onChanged(updated);
      if (tip) toast.success(tip);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const toggleComplete = async () => {
    if (!task) return;
    try {
      const updated = await api<TaskDTO>(`/tasks/${task.id}/complete`, { method: 'POST' });
      setTask(updated);
      onChanged(updated);
      toast.success(updated.status === '已完成' ? '任务已完成 🎉' : '已恢复为未开始');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const addSubTask = async () => {
    if (!task || !subInput.trim()) return;
    try {
      await api('/subtasks', { method: 'POST', body: { taskId: task.id, title: subInput.trim() } });
      setSubInput('');
      await load(task.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '添加子任务失败');
    }
  };

  const toggleSubTask = async (id: number, done: boolean) => {
    if (!task) return;
    try {
      await api(`/subtasks/${id}`, { method: 'PUT', body: { done } });
      await load(task.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新子任务失败');
    }
  };

  const removeSubTask = async (id: number) => {
    if (!task) return;
    try {
      await api(`/subtasks/${id}`, { method: 'DELETE' });
      await load(task.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除子任务失败');
    }
  };

  const addProgress = async () => {
    if (!task || !progressInput.trim()) return;
    try {
      await api('/progress-updates', {
        method: 'POST',
        body: {
          taskId: task.id,
          description: progressInput.trim(),
          statusChange: progressStatus || null
        }
      });
      setProgressInput('');
      setProgressStatus('');
      toast.success('已添加进度记录');
      await load(task.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '添加进度失败');
    }
  };

  const removeTag = async (tag: string) => {
    if (!task) return;
    const next = task.tags.filter((t) => t !== tag);
    await patch({ tags: next });
  };

  const addTag = async () => {
    if (!task || !tagText.trim()) return;
    const t = tagText.trim().replace(/^@/, '');
    if (!task.tags.includes(t)) await patch({ tags: [...task.tags, t] });
    setTagText('');
    setTagInput(false);
  };

  const deleteTask = async () => {
    if (!task) return;
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      toast.success(`已删除任务「${task.title}」`);
      onDeleted(task.id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const done = task?.status === '已完成';
  const subtasks = task?.SubTasks ?? [];
  const subDone = subtasks.filter((s) => s.done).length;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/35 animate-fade-in" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-surface border-l border-line shadow-2xl flex flex-col animate-slide-left"
        role="dialog"
        aria-label="任务详情"
      >
        {loading && !task ? (
          <div className="flex-1 flex items-center justify-center text-t3 text-sm">加载中…</div>
        ) : task ? (
          <>
            {/* 头部：完成勾选 + 标题 */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line">
              <button
                onClick={toggleComplete}
                aria-label={done ? '标记未完成' : '标记完成'}
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-t3 hover:border-accent'
                }`}
              >
                {done && <Check size={12} strokeWidth={3} />}
              </button>
              <input
                defaultValue={task.title}
                key={task.id}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== task.title) patch({ title: v }, '标题已更新');
                }}
                className={`flex-1 bg-transparent text-lg font-semibold text-t1 outline-none ${
                  done ? 'line-through text-t3' : ''
                }`}
              />
              <button onClick={onClose} className="btn-ghost !p-1.5 shrink-0" aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 属性区 */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-medium text-t3">
                    <Flag size={12} /> 状态
                  </span>
                  <select
                    value={task.status}
                    onChange={(e) => patch({ status: e.target.value }, '状态已更新')}
                    className="input-base"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-medium text-t3">
                    <Flag size={12} /> 优先级
                  </span>
                  <select
                    value={task.priority ?? ''}
                    onChange={(e) => patch({ priority: e.target.value || null }, '优先级已更新')}
                    className="input-base"
                  >
                    <option value="">无</option>
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-medium text-t3">
                    <CalendarDays size={12} /> 截止日期
                  </span>
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                    onChange={(e) => patch({ dueDate: e.target.value || null }, '截止日期已更新')}
                    className="input-base"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-medium text-t3">
                    <FolderKanban size={12} /> 所属项目
                  </span>
                  <select
                    value={task.projectId ?? ''}
                    onChange={(e) => patch({ projectId: e.target.value || null }, '项目已更新')}
                    className="input-base"
                  >
                    <option value="">未关联</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 标签 */}
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {task.tags.map((t) => (
                    <span
                      key={t}
                      className="group inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent"
                    >
                      {t}
                      <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100" aria-label={`删除标签${t}`}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {tagInput ? (
                    <input
                      autoFocus
                      value={tagText}
                      onChange={(e) => setTagText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTag();
                        if (e.key === 'Escape') setTagInput(false);
                      }}
                      onBlur={addTag}
                      placeholder="标签名，回车确认"
                      className="input-base !w-32 !py-1 !px-2 text-xs"
                    />
                  ) : (
                    <button
                      onClick={() => setTagInput(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2 py-1 text-xs text-t3 hover:border-accent hover:text-accent transition"
                    >
                      <Plus size={11} /> 添加标签
                    </button>
                  )}
                </div>
              </div>

              {/* 描述 */}
              <div>
                <p className="mb-1 text-xs font-medium text-t3">描述</p>
                <textarea
                  defaultValue={task.description ?? ''}
                  key={`desc-${task.id}`}
                  rows={3}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (task.description ?? '')) patch({ description: v || null }, '描述已更新');
                  }}
                  placeholder="补充说明、链接、注意事项…"
                  className="input-base resize-y"
                />
              </div>

              {/* 子任务 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1 text-xs font-medium text-t3">
                    <ListChecks size={12} /> 子任务
                    {subtasks.length > 0 && (
                      <span className="text-t3">
                        （{subDone}/{subtasks.length}）
                      </span>
                    )}
                  </p>
                  {subtasks.length > 0 && (
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(subDone / subtasks.length) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {subtasks.map((s) => (
                    <div key={s.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                      <button
                        onClick={() => toggleSubTask(s.id, !s.done)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                          s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-t3 hover:border-accent'
                        }`}
                        aria-label={s.done ? '取消完成' : '完成子任务'}
                      >
                        {s.done && <Check size={10} strokeWidth={3} />}
                      </button>
                      <span className={`flex-1 text-sm ${s.done ? 'text-t3 line-through' : 'text-t1'}`}>{s.title}</span>
                      <button
                        onClick={() => removeSubTask(s.id)}
                        className="text-t3 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                        aria-label="删除子任务"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                    placeholder="添加子任务，回车确认"
                    className="input-base !py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* 进度记录 */}
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium text-t3">
                  <History size={12} /> 进度记录
                </p>
                <div className="space-y-2">
                  {(task.ProgressUpdates ?? []).map((u) => (
                    <div key={u.id} className="flex gap-2.5">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      <div className="flex-1 border-b border-line pb-2">
                        <div className="flex items-baseline gap-2">
                          {u.statusChange && (
                            <span className="text-xs font-medium text-accent">{u.statusChange}</span>
                          )}
                          <span className="text-xs text-t3">{new Date(u.updateTime).toLocaleString('zh-CN')}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-t1 leading-5">{u.description}</p>
                      </div>
                    </div>
                  ))}
                  {(task.ProgressUpdates ?? []).length === 0 && (
                    <p className="text-xs text-t3">暂无进度记录，状态变更时会自动记录。</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <select value={progressStatus} onChange={(e) => setProgressStatus(e.target.value)} className="input-base !w-28">
                    <option value="">不改状态</option>
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    value={progressInput}
                    onChange={(e) => setProgressInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addProgress()}
                    placeholder="记录进展，回车提交"
                    className="input-base flex-1"
                  />
                </div>
              </div>
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <span className="text-xs text-t3">
                创建于 {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                {task.completedAt ? ` · 完成于 ${new Date(task.completedAt).toLocaleDateString('zh-CN')}` : ''}
                {task.dueDate ? ` · 截止 ${formatDue(task.dueDate)}` : ''}
              </span>
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost !text-rose-500 hover:!bg-rose-500/10">
                <Trash2 size={15} /> 删除
              </button>
            </div>

            <ConfirmDialog
              open={confirmDelete}
              title="删除任务"
              message={`确定删除任务「${task.title}」吗？其子任务与进度记录将一并删除，不可恢复。`}
              confirmText="删除"
              danger
              onConfirm={deleteTask}
              onCancel={() => setConfirmDelete(false)}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-t3">
            <ChevronRight size={22} />
            <p className="text-sm">任务不存在或已删除</p>
          </div>
        )}
      </aside>
    </div>
  );
}
