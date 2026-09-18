import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  List, KanbanSquare, CalendarDays, Grid2x2Check, ArrowUpDown, ArrowDownUp, SlidersHorizontal, CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { ProjectDTO, TaskDTO } from '../types';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants';
import QuickAdd from '../components/task/QuickAdd';
import TaskDetailPanel from '../components/task/TaskDetailPanel';
import ListView from '../components/task/views/ListView';
import BoardView from '../components/task/views/BoardView';
import CalendarView from '../components/task/views/CalendarView';
import QuadrantView from '../components/task/views/QuadrantView';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';

type ViewMode = 'list' | 'board' | 'calendar' | 'quadrant';

const VIEW_TABS: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: 'list', label: '列表', icon: List },
  { key: 'board', label: '看板', icon: KanbanSquare },
  { key: 'calendar', label: '日历', icon: CalendarDays },
  { key: 'quadrant', label: '四象限', icon: Grid2x2Check }
];

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选状态 ↔ URL 同步
  const search = searchParams.get('search') ?? '';
  const projectId = searchParams.get('projectId') ?? '';
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'dueDate';
  const order = searchParams.get('order') ?? 'asc';
  const view = (searchParams.get('view') as ViewMode) ?? 'list';
  const groupBy = (searchParams.get('groupBy') as 'date' | 'project' | 'status') ?? 'date';

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    api<ProjectDTO[]>('/projects').then(setProjects).catch(() => {});
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<TaskDTO[]>('/tasks', {
        query: { search, projectId, status, priority, tag, sort: sortBy, order }
      });
      setTasks(data);
      const tags = new Set<string>();
      for (const t of data) for (const tg of t.tags ?? []) tags.add(tg);
      setAllTags(Array.from(tags).sort());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载任务失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, projectId, status, priority, tag, sortBy, order]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const hasFilters = Boolean(search || projectId || status || priority || tag);

  /** 勾选完成切换（乐观更新） */
  const toggleTask = async (task: TaskDTO) => {
    const toDone = task.status !== '已完成';
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: toDone ? '已完成' : '未开始', completedAt: toDone ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      const updated = await api<TaskDTO>(`/tasks/${task.id}/complete`, { method: 'POST' });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      toast.success(toDone ? `已完成「${task.title}」🎉` : `已恢复「${task.title}」为未开始`);
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  /** 看板拖拽改状态 */
  const changeStatus = async (task: TaskDTO, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      const updated = await api<TaskDTO>(`/tasks/${task.id}`, { method: 'PUT', body: { status: newStatus } });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      toast.success(`「${task.title}」已移至 ${newStatus}`);
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.error(e instanceof Error ? e.message : '状态更新失败');
    }
  };

  const onTaskChanged = (updated: TaskDTO) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  const onTaskDeleted = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const onCreated = () => {
    loadTasks();
  };

  const autoFocusQuickAdd = searchParams.get('compose') === '1';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-t1">任务</h1>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          {tasks.length} 项
        </span>
        {hasFilters && (
          <button
            onClick={() => setParam({ search: null, projectId: null, status: null, priority: null, tag: null })}
            className="text-xs text-t3 underline hover:text-accent"
          >
            清除筛选
          </button>
        )}
      </div>

      <QuickAdd
        projects={projects}
        onCreated={onCreated}
        filterProjectId={projectId ? Number(projectId) : null}
        filterTag={tag || null}
        autoFocus={autoFocusQuickAdd}
      />

      {/* 工具条：视图切换 + 筛选 + 排序 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setParam({ view: t.key })}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === t.key ? 'bg-accent-soft text-accent' : 'text-t2 hover:text-t1'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SlidersHorizontal size={14} className="text-t3" />
          <select value={projectId} onChange={(e) => setParam({ projectId: e.target.value || null })} className="input-base !w-auto !py-1.5 text-xs">
            <option value="">全部项目</option>
            <option value="none">未关联项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setParam({ status: e.target.value || null })} className="input-base !w-auto !py-1.5 text-xs">
            <option value="">全部状态</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setParam({ priority: e.target.value || null })} className="input-base !w-auto !py-1.5 text-xs">
            <option value="">全部优先级</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select value={tag} onChange={(e) => setParam({ tag: e.target.value || null })} className="input-base !w-auto !py-1.5 text-xs">
              <option value="">全部标签</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          {view === 'list' && (
            <>
              <select
                value={groupBy}
                onChange={(e) => setParam({ groupBy: e.target.value })}
                className="input-base !w-auto !py-1.5 text-xs"
              >
                <option value="date">按日期分组</option>
                <option value="project">按项目分组</option>
                <option value="status">按状态分组</option>
              </select>
              <select value={sortBy} onChange={(e) => setParam({ sortBy: e.target.value })} className="input-base !w-auto !py-1.5 text-xs">
                <option value="dueDate">按截止日期</option>
                <option value="priority">按优先级</option>
                <option value="createdAt">按创建时间</option>
              </select>
              <button
                onClick={() => setParam({ order: order === 'asc' ? 'desc' : 'asc' })}
                className="btn-outline !p-2"
                title={order === 'asc' ? '切换降序' : '切换升序'}
              >
                {order === 'asc' ? <ArrowUpDown size={14} /> : <ArrowDownUp size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区 */}
      {loading ? (
        <SkeletonList count={6} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={hasFilters ? <SlidersHorizontal size={26} /> : <CheckCircle2 size={26} />}
          title={hasFilters ? '没有符合筛选条件的任务' : '暂无任务，从一个快速添加开始'}
          description={hasFilters ? '试试清除筛选或换一个条件' : '在上方输入框试试：明天 写周报 #项目 @汇报 !1'}
        />
      ) : view === 'list' ? (
        <ListView tasks={tasks} projects={projects} groupBy={groupBy} onOpen={setSelectedId} onToggle={toggleTask} />
      ) : view === 'board' ? (
        <BoardView
          tasks={tasks}
          projects={projects}
          onOpen={setSelectedId}
          onToggle={toggleTask}
          onStatusChange={changeStatus}
        />
      ) : view === 'calendar' ? (
        <CalendarView tasks={tasks} projects={projects} onOpen={setSelectedId} onToggle={toggleTask} />
      ) : (
        <QuadrantView tasks={tasks} projects={projects} onOpen={setSelectedId} onToggle={toggleTask} />
      )}

      <TaskDetailPanel
        taskId={selectedId}
        projects={projects}
        onClose={() => setSelectedId(null)}
        onChanged={onTaskChanged}
        onDeleted={onTaskDeleted}
      />
    </div>
  );
}
