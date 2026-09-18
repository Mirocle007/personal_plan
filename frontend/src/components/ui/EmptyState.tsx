import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3 text-t3 mb-4">
        {icon ?? <Inbox size={26} />}
      </div>
      <p className="text-sm font-medium text-t1">{title}</p>
      {description && <p className="mt-1 text-xs text-t3 max-w-xs leading-5">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
