import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { BarChart3, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { SummaryDTO } from '../types';

const fmt = (d: Date) => d.toISOString().slice(0, 10);

const ranges = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const d30 = new Date(today);
  d30.setDate(d30.getDate() - 29);
  return [
    { label: '本周', start: fmt(monday), end: fmt(today) },
    { label: '本月', start: fmt(monthStart), end: fmt(today) },
    { label: '上月', start: fmt(lastMonthStart), end: fmt(lastMonthEnd) },
    { label: '近 30 天', start: fmt(d30), end: fmt(today) }
  ];
};

const STATUS_COLORS = ['#94a3b8', '#0ea5e9', '#f59e0b', '#10b981', '#64748b'];

export default function Summary() {
  const [start, setStart] = useState(ranges()[1].start);
  const [end, setEnd] = useState(ranges()[1].end);
  const [data, setData] = useState<SummaryDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const generate = async (s = start, e = end) => {
    setLoading(true);
    try {
      const result = await api<SummaryDTO>('/summaries/generate', {
        method: 'POST',
        body: { startDate: s, endDate: e }
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成报告失败');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!data) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { 指标: '创建任务数', 数值: data.createdCount },
        { 指标: '完成任务数', 数值: data.completedCount },
        { 指标: '完成率', 数值: data.completionRate != null ? `${data.completionRate}%` : '—' },
        { 指标: '进度记录数', 数值: data.progressCount }
      ]),
      '总览'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        data.projectStats.map((p) => ({ 项目: p.name, 任务总数: p.total, 已完成: p.done }))
      ),
      '项目统计'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.trend.map((t) => ({ 日期: t.date, 完成任务: t.completed }))),
      '每日趋势'
    );
    XLSX.writeFile(wb, `规划报告_${data.range.startDate}_${data.range.endDate}.xlsx`);
    toast.success('Excel 已导出');
  };

  const statusPie = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.statusStats).map(([name, value]) => ({ name, value }));
  }, [data]);

  const printReport = () => {
    if (!data) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('浏览器拦截了打印窗口，请允许弹窗后重试');
      return;
    }
    const rows = data.projectStats
      .map(
        (p) =>
          `<tr><td>${p.name}</td><td>${p.total}</td><td>${p.done}</td><td>${p.total ? Math.round((p.done / p.total) * 100) : 0}%</td></tr>`
      )
      .join('');
    win.document.write(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>规划报告 ${data.range.startDate} ~ ${data.range.endDate}</title>
<style>
  body { font-family: "Microsoft YaHei", sans-serif; color: #1a1d29; padding: 40px; }
  h1 { font-size: 22px; } h2 { font-size: 16px; margin-top: 28px; }
  .meta { color: #6b7288; font-size: 13px; }
  .cards { display: flex; gap: 16px; margin-top: 20px; }
  .card { flex: 1; border: 1px solid #e5e8f0; border-radius: 10px; padding: 14px; text-align: center; }
  .num { font-size: 26px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #e5e8f0; padding: 8px 10px; text-align: left; }
  th { background: #f4f5fa; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>个人规划报告</h1>
<p class="meta">统计区间：${data.range.startDate} 至 ${data.range.endDate} · 生成于 ${new Date().toLocaleString('zh-CN')}</p>
<div class="cards">
  <div class="card"><div class="num">${data.createdCount}</div>创建任务</div>
  <div class="card"><div class="num">${data.completedCount}</div>完成任务</div>
  <div class="card"><div class="num">${data.completionRate != null ? data.completionRate + '%' : '—'}</div>完成率</div>
  <div class="card"><div class="num">${data.progressCount}</div>进度记录</div>
</div>
<h2>项目进展</h2>
<table><tr><th>项目</th><th>任务总数</th><th>已完成</th><th>完成率</th></tr>${rows}</table>
<script>window.onload = () => { window.print(); };</script>
</body></html>`);
    win.document.close();
  };

  const quick = ranges();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-t1">
          <BarChart3 size={20} className="text-accent" /> 统计报告
        </h1>
        {data && (
          <span className="text-xs text-t3">
            {data.range.startDate} ~ {data.range.endDate}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2 print:hidden">
          {data && (
            <>
              <button onClick={exportExcel} className="btn-outline">
                <FileSpreadsheet size={15} /> 导出 Excel
              </button>
              <button onClick={printReport} className="btn-outline">
                <Printer size={15} /> 打印 / PDF
              </button>
            </>
          )}
          <button onClick={() => generate()} className="btn-primary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> 生成报告
          </button>
        </div>
      </div>

      {/* 时间范围选择 */}
      <div className="card flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                setStart(q.start);
                setEnd(q.end);
                generate(q.start, q.end);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                start === q.start && end === q.end
                  ? 'bg-accent-soft text-accent'
                  : 'bg-surface-2 text-t2 hover:bg-surface-3'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <label className="text-xs text-t3">
          开始
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input-base mt-1 !py-1.5"
          />
        </label>
        <label className="text-xs text-t3">
          结束
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input-base mt-1 !py-1.5"
          />
        </label>
      </div>

      {!data ? (
        <div className="card p-14 text-center text-sm text-t3">
          选择时间范围后点击「生成报告」查看统计
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* 指标卡 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: '创建任务', value: data.createdCount },
              { label: '完成任务', value: data.completedCount },
              { label: '完成率', value: data.completionRate != null ? `${data.completionRate}%` : '—' },
              { label: '进度记录', value: data.progressCount }
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-2xl font-bold text-t1">{s.value}</p>
                <p className="mt-0.5 text-xs text-t3">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 每日完成趋势 */}
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-t1">每日完成趋势</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => v.slice(5)}
                      tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)', border: '1px solid var(--border-soft)',
                        borderRadius: 10, fontSize: 12, color: 'var(--text-1)'
                      }}
                    />
                    <Bar dataKey="completed" name="完成" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 状态分布 */}
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-t1">任务状态分布</h2>
              {statusPie.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        label={({ name, value }) => (value ? `${name} ${value}` : '')}
                        labelLine={false}
                        fontSize={11}
                      >
                        {statusPie.map((entry, i) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface)', border: '1px solid var(--border-soft)',
                          borderRadius: 10, fontSize: 12, color: 'var(--text-1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-t3">该区间暂无任务数据</p>
              )}
            </section>
          </div>

          {/* 项目进展 */}
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold text-t1">项目进展</h2>
            {data.projectStats.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs text-t3">
                    <th className="px-5 py-2.5 text-left font-medium">项目</th>
                    <th className="px-5 py-2.5 text-right font-medium">任务总数</th>
                    <th className="px-5 py-2.5 text-right font-medium">已完成</th>
                    <th className="px-5 py-2.5 text-right font-medium">完成率</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projectStats.map((p) => (
                    <tr key={p.name} className="border-b border-line last:border-0">
                      <td className="flex items-center gap-2 px-5 py-3 text-t1">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? '#6366f1' }} />
                        {p.name}
                      </td>
                      <td className="px-5 py-3 text-right text-t2">{p.total}</td>
                      <td className="px-5 py-3 text-right text-t2">{p.done}</td>
                      <td className="px-5 py-3 text-right font-medium text-t1">
                        {p.total ? Math.round((p.done / p.total) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-t3">该区间暂无项目相关任务</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
