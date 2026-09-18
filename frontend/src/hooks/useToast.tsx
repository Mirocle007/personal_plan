/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastCtx {
  success: (message: string, action?: ToastItem['action']) => void;
  error: (message: string, action?: ToastItem['action']) => void;
  info: (message: string, action?: ToastItem['action']) => void;
}

const Ctx = createContext<ToastCtx>({ success: () => {}, error: () => {}, info: () => {} });

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={17} className="text-rose-500 shrink-0" />,
  info: <Info size={17} className="text-sky-500 shrink-0" />
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: string, action?: ToastItem['action']) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-3), { id, kind, message, action }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const value: ToastCtx = {
    success: (m, a) => push('success', m, a),
    error: (m, a) => push('error', m, a),
    info: (m, a) => push('info', m, a)
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg animate-slide-left"
          >
            {ICONS[t.kind]}
            <div className="flex-1 min-w-0 text-sm text-t1 leading-5">{t.message}</div>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  setItems((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="text-sm font-medium text-accent hover:underline shrink-0"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-t3 hover:text-t1 shrink-0"
              aria-label="关闭"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
