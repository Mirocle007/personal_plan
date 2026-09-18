import { Sun, Moon, Monitor, Keyboard, Info } from 'lucide-react';
import { useTheme, type ThemeMode } from '../hooks/useTheme';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: typeof Sun; desc: string }[] = [
  { key: 'light', label: '浅色', icon: Sun, desc: '明亮清爽，适合白天' },
  { key: 'dark', label: '深色', icon: Moon, desc: '低光护眼，适合夜晚' },
  { key: 'system', label: '跟随系统', icon: Monitor, desc: '自动匹配系统设置' }
];

const SHORTCUTS = [
  { keys: 'N', desc: '快速新建任务' },
  { keys: '/', desc: '聚焦全局搜索' },
  { keys: 'Esc', desc: '关闭弹窗 / 侧滑面板' },
  { keys: 'Enter', desc: '确认（快速添加、子任务、进度记录）' }
];

export default function Settings() {
  const { mode, setMode } = useTheme();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-t1">设置</h1>

      {/* 主题 */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-t1">外观</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                mode === opt.key
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:border-accent/40'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  mode === opt.key ? 'bg-accent text-white' : 'bg-surface-2 text-t2'
                }`}
              >
                <opt.icon size={17} />
              </span>
              <span>
                <span className="block text-sm font-medium text-t1">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-t3">{opt.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 快捷键 */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-t1">
          <Keyboard size={16} className="text-accent" /> 快捷键
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
              <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-t1 shadow-sm">
                {s.keys}
              </kbd>
              <span className="text-sm text-t2">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 关于 */}
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-t1">
          <Info size={16} className="text-accent" /> 关于
        </h2>
        <div className="space-y-1 text-sm text-t2">
          <p>个人规划中心 v2.0 — 集任务、看板、日历、四象限、习惯、番茄钟于一体的本地规划工具。</p>
          <p className="text-xs text-t3">
            技术栈：React 19 + Tailwind CSS 4 + Express 5 + SQLite。数据完全存储在本地。
          </p>
        </div>
      </section>
    </div>
  );
}
