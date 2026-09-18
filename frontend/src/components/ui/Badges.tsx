/** 徽章：状态 / 优先级 / 标签 / 日期 */
import { PRIORITY_META, STATUS_META } from '../../constants';

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META['未开始'];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const meta = PRIORITY_META[priority];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}优先级
    </span>
  );
}

export function TagChip({ tag, onClick }: { tag: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent hover:brightness-95 transition"
    >
      {tag}
    </button>
  );
}

export function DueBadge({ label, overdue }: { label: string; overdue?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        overdue ? 'text-rose-500' : 'text-t3'
      }`}
    >
      {label}
    </span>
  );
}
