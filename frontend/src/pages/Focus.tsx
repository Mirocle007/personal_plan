import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Coffee, Target, Flame } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { TaskDTO } from '../types';

type Phase = 'focus' | 'break';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const todayKey = () => new Date().toISOString().slice(0, 10);

const loadCount = (): number => {
  const raw = localStorage.getItem('pp-pomodoro');
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw) as { date: string; count: number };
    return data.date === todayKey() ? data.count : 0;
  } catch {
    return 0;
  }
};

const saveCount = (count: number) => {
  localStorage.setItem('pp-pomodoro', JSON.stringify({ date: todayKey(), count }));
};

/** 短提示音（WebAudio 合成，无需资源文件） */
const beep = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.25);
  } catch {
    /* 忽略音频失败 */
  }
};

export default function Focus() {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(loadCount);
  const timerRef = useRef<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    api<TaskDTO[]>('/tasks', { query: { status: '未开始,进行中,待审核' } })
      .then((list) => setTasks(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (remaining > 0 || !running) return;
    // 计时结束
    setRunning(false);
    beep();
    if (phase === 'focus') {
      const next = count + 1;
      setCount(next);
      saveCount(next);
      toast.success('专注完成！休息 5 分钟一下吧 ☕');
      setPhase('break');
      setRemaining(BREAK_SECONDS);
    } else {
      toast.info('休息结束，开始新的一轮专注吧');
      setPhase('focus');
      setRemaining(FOCUS_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  const total = phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
  const progress = 1 - remaining / total;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  const reset = () => {
    setRunning(false);
    setPhase('focus');
    setRemaining(FOCUS_SECONDS);
  };

  const R = 120;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-t1">番茄专注</h1>
        <p className="mt-1 text-sm text-t3">25 分钟专注 + 5 分钟休息，选一个任务开始</p>
      </div>

      {/* 任务选择 */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <Target size={16} className="text-accent" />
        <select
          value={selectedTask?.id ?? ''}
          onChange={(e) => setSelectedTask(tasks.find((t) => t.id === Number(e.target.value)) ?? null)}
          className="input-base flex-1 !py-1.5"
        >
          <option value="">选择要专注的任务（可选）</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Flame size={13} /> 今日 {count} 个番茄
        </span>
      </div>

      {/* 计时器 */}
      <div className="card flex flex-col items-center p-8">
        <span
          className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            phase === 'focus' ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {phase === 'focus' ? <Target size={12} /> : <Coffee size={12} />}
          {phase === 'focus' ? '专注中' : '休息中'}
        </span>

        <div className="relative h-72 w-72">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--border-soft)" strokeWidth="14" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={phase === 'focus' ? '#6366f1' : '#10b981'}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tabular-nums text-t1">
              {minutes}:{seconds}
            </span>
            <span className="mt-1 text-xs text-t3">{selectedTask ? selectedTask.title : '自由专注'}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={reset} className="btn-outline !p-3" title="重置" aria-label="重置">
            <RotateCcw size={17} />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="btn-primary !px-8 !py-3 !text-base"
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
            {running ? '暂停' : remaining === total ? '开始专注' : '继续'}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-t3">
        提示：完成一个番茄后可在任务详情中添加进度记录，让成果可见。
      </p>
    </div>
  );
}
