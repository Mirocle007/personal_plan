import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { CheckCircle2, CalendarClock, AlarmClock, FolderKanban, ArrowRight, Sun, Sunset, Moon } from 'lucide-react';
import { api } from '../api/client';
import type { DashboardDTO, TaskDTO } from '../types';
import { formatDue, isOverdue } from '../constants';
import { SkeletonCards, SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return { text: '夜深了', icon: Moon };
  if (h < 12) return { text: '早上好', icon: Sun };
  if (h < 18) return { text: '下午好', icon: Sunset };
  return { text: '晚上好', icon: Moon };
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    api<DashboardDTO>('/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (task: TaskDTO) => {
    try {
      await api<TaskDTO>(`/tasks/${task.id}/complete`, { method: 'POST' });
      load();
    } catch {
      /* 静默，简单处理 */
    }
  };

  const g = greeting();
  const dateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  const stats = [
    { label: '今日待办', value: data?.stats.todayCount ?? 0, icon: CalendarClock, tone: 'text-sky-500 bg-sky-500/10', to: '/tasks?status=未开始,进行中' },
    { label: '已逾期', value: data?.stats.overdueCount ?? 0, icon: AlarmClock, tone: 'text-rose-500 bg-rose-500/10', to: '/tasks' },
    { label: '已完成', value: data?.stats.completedTasks ?? 0, icon: CheckCircle2, tone: 'text-emerald-500 bg-emerald-500/10', to: '/tasks?status=已完成' },
    { label: '进行中', value: data?.stats.inProgressTasks ?? 0, icon: FolderKanban, tone: 'text-indigo-500 bg-indigo-500/10', to: '/tasks?status=进行中' }
  ];

  return (
    <div className="space-y-6">
      {/* 问候区 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-t1">
            <g.icon size={24} className="text-accent" />
            {g.text}
          </h1>
          <p className="mt-1 text-sm text-t3">{dateStr}</p>
        </div>
        <button onClick={() => navigate('/tasks?compose=1')} className="btn-primary">
          快速添加任务
        </button>
      </div>

      {loading ? (
        <>
          <SkeletonCards />
          <SkeletonList count={4} />
        </>
      ) : (
        <>
          {/* 统计卡 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <button
                key={s.label}
                onClick={() => navigate(s.to)}
                className="card flex items-center gap-4 p-4 text-left transition hover:shadow-md hover:-translate-y-0.5"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                  <s.icon size={20} />
                </span>
                <div>
                  <p className="text-2xl font-bold text-t1 leading-7">{s.value}</p>
                  <p className="text-xs text-t3">{s.label}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 左列 2/3：今日聚焦 + 趋势 */}
            <div className="space-y-6 lg:col-span-2">
              <section className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-t1">
                    <CalendarClock size={16} className="text-accent" /> 今日聚焦
                  </h2>
                  <button onClick={() => navigate('/tasks')} className="flex items-center gap-1 text-xs text-t3 hover:text-accent">
                    全部任务 <ArrowRight size={12} />
                  </button>
                </div>
                {data && data.today.length > 0 ? (
                  <div className="space-y-1.5">
                    {data.today.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggle(t)}
                        className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-left transition hover:border-accent/40"
                      >
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-t3 transition hover:border-emerald-500" />
                        <span className="flex-1 truncate text-sm text-t1">{t.title}</span>
                        {t.priority && (
                          <span className={`text-xs font-medium ${t.priority === '高' ? 'text-rose-500' : t.priority === '中' ? 'text-amber-500' : 'text-sky-500'}`}>
                            {t.priority}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CheckCircle2 size={26} />}
                    title="今天没有截止的任务"
                    description="休息一下，或去任务页提前规划后面的事"
                    action={
                      <button onClick={() => navigate('/tasks?compose=1')} className="btn-outline">
                        添加新任务
                      </button>
                    }
                  />
                )}
              </section>

              <section className="card p-5">
                <h2 className="mb-3 text-sm font-semibold text-t1">近 7 天完成趋势</h2>
                {data && data.trend.some((p) => p.completed > 0) ? (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--surface)', border: '1px solid var(--border-soft)',
                            borderRadius: 10, fontSize: 12, color: 'var(--text-1)'
                          }}
                        />
                        <Area type="monotone" dataKey="completed" name="完成" stroke="#6366f1" strokeWidth={2} fill="url(#trendFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-t3">近 7 天还没有完成任务记录</p>
                )}
              </section>
            </div>

            {/* 右列：逾期 + 即将到期 + 项目进度 */}
            <div className="space-y-6">
              {data && data.overdue.length > 0 && (
                <section className="card border-rose-500/30 p-5">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-500">
                    <AlarmClock size={15} /> 已逾期 {data.overdue.length}
                  </h2>
                  <div className="space-y-1">
                    {data.overdue.slice(0, 4).map((t) => (
                      <button key={t.id} onClick={() => navigate(`/tasks?search=${encodeURIComponent(t.title)}`)} className="block w-full truncate rounded px-1 py-1 text-left text-sm text-t1 hover:text-rose-500">
                        {t.title}
                        <span className="ml-1.5 text-xs text-t3">{formatDue(t.dueDate)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="card p-5">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-t1">
                  <CalendarClock size={15} className="text-accent" /> 即将到期
                </h2>
                {data && data.upcoming.length > 0 ? (
                  <div className="space-y-1">
                    {data.upcoming.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded px-1 py-1">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span className="flex-1 truncate text-sm text-t1">{t.title}</span>
                        <span className={`text-xs ${isOverdue(t) ? 'text-rose-500' : 'text-t3'}`}>{formatDue(t.dueDate)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-t3">未来 7 天没有到期任务</p>
                )}
              </section>

              <section className="card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-t1">
                  <FolderKanban size={15} className="text-accent" /> 项目进度
                </h2>
                {data && data.projects.length > 0 ? (
                  <div className="space-y-3">
                    {data.projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/tasks?projectId=${p.id}`)}
                        className="block w-full text-left"
                      >
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-t1">
                            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? '#6366f1' }} />
                            {p.name}
                          </span>
                          <span className="text-t3">
                            {p.done}/{p.total}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%`, background: p.color ?? '#6366f1' }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-t3">还没有项目，去创建一个吧</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
