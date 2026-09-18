import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, FolderKanban, Repeat, Timer,
  BarChart3, DatabaseBackup, Settings, Sun, Moon, Monitor, Plus, Search, Menu, X
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { QUICK_ADD_EVENT, SEARCH_EVENT } from '../../events';

const NAV_GROUPS: { label: string; items: { to: string; label: string; icon: typeof ListChecks }[] }[] = [
  {
    label: '概览',
    items: [{ to: '/', label: '仪表盘', icon: LayoutDashboard }]
  },
  {
    label: '规划',
    items: [
      { to: '/tasks', label: '任务', icon: ListChecks },
      { to: '/projects', label: '项目', icon: FolderKanban },
      { to: '/habits', label: '习惯打卡', icon: Repeat }
    ]
  },
  {
    label: '工具',
    items: [
      { to: '/focus', label: '番茄专注', icon: Timer },
      { to: '/summary', label: '统计报告', icon: BarChart3 }
    ]
  },
  {
    label: '系统',
    items: [
      { to: '/backup', label: '数据备份', icon: DatabaseBackup },
      { to: '/settings', label: '设置', icon: Settings }
    ]
  }
];

export default function AppShell() {
  const { mode, resolved, setMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<number | null>(null);

  // 全局快捷键：n 新建任务（仅非输入框），/ 搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (typing) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (location.pathname === '/tasks') {
          window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT));
        } else {
          navigate('/tasks?compose=1');
        }
      } else if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: '' }));
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [location.pathname, navigate]);

  // 全局搜索：输入即跳任务页搜索
  const onSearchChange = (v: string) => {
    setSearchText(v);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      navigate(`/tasks?search=${encodeURIComponent(v)}`, { replace: location.pathname === '/tasks' });
    }, 400);
  };

  // 快速创建：跳任务页并聚焦快速添加
  const goQuickAdd = () => {
    if (location.pathname === '/tasks') {
      window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT));
    } else {
      navigate('/tasks?compose=1');
    }
  };

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
    toast.info(
      next === 'light' ? '已切换为浅色模式' : next === 'dark' ? '已切换为深色模式' : '已跟随系统主题'
    );
  };

  const ThemeIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;

  return (
    <div className="flex h-full">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-full w-60 shrink-0 border-r border-line bg-surface
          flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
            <ListChecks size={17} />
          </div>
          <div>
            <p className="text-sm font-bold text-t1 leading-4">个人规划中心</p>
            <p className="text-[10px] text-t3 mt-0.5">Personal Planner v2</p>
          </div>
          <button className="ml-auto lg:hidden text-t3 hover:text-t1" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-t3">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-t2 hover:bg-surface-3 hover:text-t1'
                      }`
                    }
                  >
                    <item.icon size={17} className="shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* 主区 */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="sticky top-0 z-20 flex items-center gap-2 h-16 px-4 sm:px-6 border-b border-line bg-surface/85 backdrop-blur">
          <button className="lg:hidden btn-ghost !p-2" onClick={() => setSidebarOpen(true)} aria-label="打开菜单">
            <Menu size={19} />
          </button>

          {searchOpen ? (
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input
                ref={searchRef}
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={() => !searchText && setSearchOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/tasks?search=${encodeURIComponent(searchText)}`);
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                placeholder="搜索任务标题或描述，回车确认"
                className="input-base !pl-9 h-9"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 h-9 text-sm text-t3 hover:border-accent/50 hover:text-t2 transition w-64"
            >
              <Search size={15} />
              搜索任务…
              <kbd className="ml-auto text-[10px] border border-line rounded px-1 py-0.5">/</kbd>
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={goQuickAdd} className="btn-primary !py-1.5" title="快速新建任务 (N)">
              <Plus size={16} />
              <span className="hidden sm:inline">新建任务</span>
            </button>
            <button onClick={cycleTheme} className="btn-ghost !p-2" title={`主题：${mode}`} aria-label="切换主题">
              <ThemeIcon size={17} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 print:hidden">
            <Outlet />
          </div>
          {/* 打印报告由 Summary 页通过 portal/媒体查询渲染 */}
          <div id="print-root" className="hidden print:block p-8" />
        </main>
      </div>
    </div>
  );
}
