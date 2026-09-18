import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Pencil, Trash2, Plus } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { ProjectDTO } from '../types';
import { PROJECT_COLORS } from '../constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCards } from '../components/ui/Skeleton';

interface FormState {
  name: string;
  description: string;
  manager: string;
  color: string;
}

const EMPTY: FormState = { name: '', description: '', manager: '', color: PROJECT_COLORS[0] };

export default function Projects() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleting, setDeleting] = useState<ProjectDTO | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => {
    api<ProjectDTO[]>('/projects')
      .then(setProjects)
      .catch((e) => toast.error(e instanceof Error ? e.message : '加载项目失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (p: ProjectDTO) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      manager: p.manager ?? '',
      color: p.color ?? PROJECT_COLORS[0]
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('项目名称不能为空');
      return;
    }
    try {
      if (editing) {
        await api(`/projects/${editing.id}`, { method: 'PUT', body: form });
        toast.success('项目已更新');
      } else {
        await api('/projects', { method: 'POST', body: form });
        toast.success(`已创建项目「${form.name}」`);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const res = await api<{ detachedTasks: number }>(`/projects/${deleting.id}`, { method: 'DELETE' });
      toast.success(
        res.detachedTasks > 0
          ? `项目已删除，${res.detachedTasks} 个任务保留为未关联`
          : '项目已删除'
      );
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-t1">项目</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={15} /> 新建项目
        </button>
      </div>

      {loading ? (
        <SkeletonCards />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={26} />}
          title="还没有项目"
          description="项目用来归类任务，比如「固件开发」「毕业设计」"
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus size={15} /> 创建第一个项目
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const stats = p.taskStats ?? { total: 0, done: 0, inProgress: 0 };
            const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
            return (
              <div key={p.id} className="card group relative overflow-hidden p-5 transition hover:shadow-md">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: p.color ?? '#6366f1' }} />
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => navigate(`/tasks?projectId=${p.id}`)} className="min-w-0 text-left">
                    <h3 className="truncate text-base font-semibold text-t1 hover:text-accent">{p.name}</h3>
                    {p.manager && <p className="mt-0.5 text-xs text-t3">负责人：{p.manager}</p>}
                  </button>
                  <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button onClick={() => openEdit(p)} className="btn-ghost !p-1.5" aria-label="编辑项目">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(p)} className="btn-ghost !p-1.5 !text-rose-500" aria-label="删除项目">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {p.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-t2 leading-5">{p.description}</p>
                )}

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-t3">
                    <span>
                      {stats.total} 个任务 · {stats.inProgress} 个进行中
                    </span>
                    <span className="font-medium text-t2">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color ?? '#6366f1' }} />
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/tasks?projectId=${p.id}`)}
                  className="mt-3 text-xs font-medium text-accent hover:underline"
                >
                  查看项目任务 →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑项目' : '新建项目'}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-primary" onClick={submit}>{editing ? '保存' : '创建'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-t3">项目名称 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：固件开发"
              className="input-base"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-t3">描述</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="项目的简要说明（可选）"
              className="input-base resize-y"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-t3">负责人</span>
              <input
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                placeholder="可选"
                className="input-base"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs font-medium text-t3">颜色标识</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`选择颜色${c}`}
                    className={`h-6 w-6 rounded-full transition ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-accent ring-offset-surface scale-110' : ''
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="删除项目"
        message={`确定删除项目「${deleting?.name}」吗？项目下的任务不会被删除，将变为未关联。`}
        confirmText="删除"
        danger
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
