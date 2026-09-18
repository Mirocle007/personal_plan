import { useEffect, useState } from 'react';
import { Flame, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { HabitDTO } from '../types';
import { HABIT_ICONS } from '../constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';

interface FormState {
  name: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  weeklyTarget: number;
}

const EMPTY: FormState = { name: '', icon: '✅', frequency: 'daily', weeklyTarget: 3 };

export default function Habits() {
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HabitDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleting, setDeleting] = useState<HabitDTO | null>(null);
  const toast = useToast();

  const load = () => {
    api<HabitDTO[]>('/habits')
      .then(setHabits)
      .catch((e) => toast.error(e instanceof Error ? e.message : '加载习惯失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (h: HabitDTO) => {
    setEditing(h);
    setForm({
      name: h.name,
      icon: h.icon,
      frequency: h.frequency,
      weeklyTarget: h.weeklyTarget ?? 3
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('习惯名称不能为空');
      return;
    }
    try {
      if (editing) {
        await api(`/habits/${editing.id}`, { method: 'PUT', body: form });
        toast.success('习惯已更新');
      } else {
        await api('/habits', { method: 'POST', body: form });
        toast.success(`已创建习惯「${form.name}」`);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const check = async (h: HabitDTO) => {
    // 乐观更新
    setHabits((prev) =>
      prev.map((x) =>
        x.id === h.id
          ? {
              ...x,
              todayChecked: !h.todayChecked,
              streak: Math.max(0, x.streak + (h.todayChecked ? -1 : 1))
            }
          : x
      )
    );
    try {
      await api(`/habits/${h.id}/check`, { method: 'POST' });
      if (!h.todayChecked) toast.success(`「${h.name}」打卡成功 🔥`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '打卡失败');
      load();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/habits/${deleting.id}`, { method: 'DELETE' });
      toast.success('习惯已删除');
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const checkedToday = habits.filter((h) => h.todayChecked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-t1">习惯打卡</h1>
          <p className="mt-0.5 text-xs text-t3">
            {habits.length > 0 ? `今天已完成 ${checkedToday}/${habits.length} 个习惯` : '坚持下去，见证复利'}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={15} /> 新建习惯
        </button>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<Flame size={26} />}
          title="还没有习惯"
          description="从「每天读书 10 分钟」这样的小目标开始"
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus size={15} /> 创建第一个习惯
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {habits.map((h) => (
            <div
              key={h.id}
              className={`card group flex flex-wrap items-center gap-3 p-4 transition ${
                h.todayChecked ? 'border-emerald-500/40' : ''
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl">
                {h.icon}
              </span>

              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`max-w-full truncate text-sm font-semibold ${h.todayChecked ? 'text-t2' : 'text-t1'}`}>
                    {h.name}
                  </p>
                  {h.streak > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Flame size={11} /> 连续 {h.streak} 天
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-t3">
                  {h.frequency === 'daily' ? '每天' : `每周 ${h.weeklyTarget} 次`} · 累计 {h.totalChecked} 次
                </p>
              </div>

              {/* 近 7 天 */}
              <div className="flex shrink-0 items-center gap-1">
                {h.last7.map((d) => (
                  <span
                    key={d.date}
                    title={d.date}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] ${
                      d.checked ? 'bg-emerald-500/15 text-emerald-500' : 'bg-surface-3 text-t3'
                    }`}
                  >
                    {d.checked ? <Check size={12} strokeWidth={3} /> : new Date(`${d.date}T12:00:00`).getDate()}
                  </span>
                ))}
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => check(h)}
                  className={`btn !px-4 ${
                    h.todayChecked
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                      : 'btn-primary'
                  }`}
                >
                  {h.todayChecked ? <Check size={15} strokeWidth={3} /> : <Flame size={15} />}
                  {h.todayChecked ? '已完成' : '打卡'}
                </button>
                <button
                  onClick={() => openEdit(h)}
                  className="btn-ghost !p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="编辑习惯"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleting(h)}
                  className="btn-ghost !p-1.5 !text-rose-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="删除习惯"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑习惯' : '新建习惯'}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-primary" onClick={submit}>{editing ? '保存' : '创建'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-t3">习惯名称 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：晨间阅读"
              className="input-base"
              autoFocus
            />
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-t3">图标</span>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setForm({ ...form, icon })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                    form.icon === icon ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2 hover:bg-surface-3'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-t3">频率</span>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as 'daily' | 'weekly' })}
                className="input-base"
              >
                <option value="daily">每天</option>
                <option value="weekly">每周 N 次</option>
              </select>
            </label>
            {form.frequency === 'weekly' && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-t3">每周目标次数</span>
                <select
                  value={form.weeklyTarget}
                  onChange={(e) => setForm({ ...form, weeklyTarget: Number(e.target.value) })}
                  className="input-base"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n} 次</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="删除习惯"
        message={`确定删除习惯「${deleting?.name}」吗？历史打卡记录将一并删除。`}
        confirmText="删除"
        danger
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
