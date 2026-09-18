import { useEffect, useState } from 'react';
import { DatabaseBackup, Download, Trash2, Upload, HardDriveDownload } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { BackupDTO } from '../types';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/Skeleton';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function Backup() {
  const [backups, setBackups] = useState<BackupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<BackupDTO | null>(null);
  const [deleting, setDeleting] = useState<BackupDTO | null>(null);
  const toast = useToast();

  const load = () => {
    api<BackupDTO[]>('/backups')
      .then(setBackups)
      .catch((e) => toast.error(e instanceof Error ? e.message : '加载备份列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setCreating(true);
    try {
      const res = await api<{ fileName: string }>('/backups', { method: 'POST' });
      toast.success(`备份已创建：${res.fileName}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建备份失败');
    } finally {
      setCreating(false);
    }
  };

  const restore = async () => {
    if (!restoring) return;
    try {
      await api(`/backups/${restoring.fileName}/restore`, { method: 'POST' });
      toast.success('数据已恢复，正在刷新页面…');
      setRestoring(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '恢复失败');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/backups/${deleting.fileName}`, { method: 'DELETE' });
      toast.success('备份已删除');
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-t1">
            <DatabaseBackup size={20} className="text-accent" /> 数据备份
          </h1>
          <p className="mt-0.5 text-xs text-t3">数据保存在本地 SQLite，建议定期备份</p>
        </div>
        <button onClick={create} className="btn-primary" disabled={creating}>
          <Download size={15} /> {creating ? '创建中…' : '创建备份'}
        </button>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : backups.length === 0 ? (
        <EmptyState
          icon={<DatabaseBackup size={26} />}
          title="还没有备份"
          description="创建第一个备份，安心使用"
          action={
            <button onClick={create} className="btn-primary" disabled={creating}>
              <Download size={15} /> 创建备份
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.fileName} className="card flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-t2">
                <HardDriveDownload size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-t1">{b.fileName}</p>
                <p className="text-xs text-t3">
                  {formatSize(b.size)} · {new Date(b.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setRestoring(b)} className="btn-outline !py-1.5 text-xs">
                  <Upload size={13} /> 恢复
                </button>
                <button
                  onClick={() => setDeleting(b)}
                  className="btn-ghost !p-2 !text-rose-500"
                  aria-label={`删除备份${b.fileName}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 text-xs leading-5 text-t3">
        <p className="mb-1 font-medium text-t2">说明</p>
        <p>· 备份文件保存在后端 backups 目录，恢复时不会覆盖数据库文件，而是安全地导入数据。</p>
        <p>· 恢复会用备份内容替换当前全部数据（任务/项目/习惯等），操作前请确认。</p>
      </div>

      <ConfirmDialog
        open={restoring !== null}
        title="恢复备份"
        message={`确定用「${restoring?.fileName}」恢复数据吗？当前数据将被备份时的内容替换。`}
        confirmText="恢复"
        onConfirm={restore}
        onCancel={() => setRestoring(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="删除备份"
        message={`确定删除备份「${deleting?.fileName}」吗？此操作不可恢复。`}
        confirmText="删除"
        danger
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
