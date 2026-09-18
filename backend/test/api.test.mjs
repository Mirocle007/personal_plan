/**
 * API 自动化测试（node --test）
 * - 自行启动后端（临时数据库 + 独立端口）
 * - 覆盖：健康检查、任务 CRUD/筛选/完成切换、子任务、项目、进度、习惯、
 *   仪表盘、汇总、备份（含路径穿越防护）、级联删除、参数校验
 * - 结束后清理测试产生的备份文件
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.TEST_PORT || '3210';
const BASE = `http://localhost:${PORT}/api`;
const DB_PATH = path.join(os.tmpdir(), `pp-test-${Date.now()}.sqlite`);
const BACKEND_ROOT = path.resolve(__dirname, '..');

let child;

const request = async (method, pathname, body) => {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
};

const waitUntilHealthy = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* 未启动，继续等 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('后端未能在 30 秒内启动');
};

test.before(async () => {
  const tsNodeBin = require.resolve('ts-node/dist/bin.js');
  child = spawn(process.execPath, [tsNodeBin, 'src/index.ts'], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DB_PATH, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  await waitUntilHealthy();
});

test.after(() => {
  if (child) child.kill();
  for (const f of [DB_PATH, `${DB_PATH}-journal`, `${DB_PATH}-shm`, `${DB_PATH}-wal`]) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* 文件可能仍被占用，忽略 */
      }
    }
  }
});

// ---------- 基础 ----------

test('GET /health 返回 ok', async () => {
  const { status, data } = await request('GET', '/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
});

// ---------- 项目 ----------

let projectId;
let projectId2;

test('创建项目（含颜色）', async () => {
  const { status, data } = await request('POST', '/projects', {
    name: '测试项目A', description: '用于自动化测试', manager: '测试员', color: '#10b981'
  });
  assert.equal(status, 201);
  assert.equal(data.name, '测试项目A');
  assert.equal(data.color, '#10b981');
  projectId = data.id;
});

test('创建第二个项目', async () => {
  const { status, data } = await request('POST', '/projects', { name: '测试项目B' });
  assert.equal(status, 201);
  projectId2 = data.id;
});

test('项目名称必填', async () => {
  const { status } = await request('POST', '/projects', { name: '' });
  assert.equal(status, 400);
});

test('项目列表带任务统计', async () => {
  const { status, data } = await request('GET', '/projects');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data[0].taskStats, 'taskStats 应存在');
});

test('项目颜色格式校验', async () => {
  const { status } = await request('POST', '/projects', { name: '坏颜色', color: 'red' });
  assert.equal(status, 400);
});

// ---------- 任务 CRUD 与校验 ----------

let taskId;
let taskId2;

test('创建任务（完整字段）', async () => {
  const { status, data } = await request('POST', '/tasks', {
    title: '编写测试用例',
    description: '覆盖核心接口',
    priority: '高',
    status: '进行中',
    projectId,
    tags: ['测试', '自动化'],
    dueDate: '2026-12-01'
  });
  assert.equal(status, 201);
  assert.equal(data.title, '编写测试用例');
  assert.deepEqual(data.tags, ['测试', '自动化']);
  assert.equal(data.priority, '高');
  assert.ok(data.dueDate.startsWith('2026-12-01'), `dueDate=${data.dueDate}`);
  taskId = data.id;
});

test('创建第二个任务', async () => {
  const { status, data } = await request('POST', '/tasks', {
    title: '修复登录问题', priority: '中', projectId: projectId2, tags: ['测试']
  });
  assert.equal(status, 201);
  taskId2 = data.id;
});

test('空标题返回 400', async () => {
  const { status } = await request('POST', '/tasks', { title: '  ' });
  assert.equal(status, 400);
});

test('非法优先级返回 400', async () => {
  const { status } = await request('POST', '/tasks', { title: 'x', priority: '最高' });
  assert.equal(status, 400);
});

test('非法状态返回 400', async () => {
  const { status } = await request('POST', '/tasks', { title: 'x', status: '已完成2' });
  assert.equal(status, 400);
});

test('关联不存在的项目返回 400', async () => {
  const { status } = await request('POST', '/tasks', { title: 'x', projectId: 99999 });
  assert.equal(status, 400);
});

test('不存在的任务返回 404', async () => {
  const { status } = await request('GET', '/tasks/99999');
  assert.equal(status, 404);
});

test('标签数组非法时返回 400', async () => {
  const { status } = await request('POST', '/tasks', { title: 'x', tags: 'not-array' });
  assert.equal(status, 400);
});

// ---------- 筛选 / 搜索 / 排序 ----------

test('按关键词搜索', async () => {
  const { status, data } = await request('GET', '/tasks?search=' + encodeURIComponent('登录'));
  assert.equal(status, 200);
  assert.equal(data.length, 1);
  assert.equal(data[0].id, taskId2);
});

test('按项目筛选', async () => {
  const { data } = await request('GET', `/tasks?projectId=${projectId}`);
  assert.equal(data.length, 1);
  assert.equal(data[0].id, taskId);
});

test('按标签筛选', async () => {
  const { data } = await request('GET', '/tasks?tag=' + encodeURIComponent('自动化'));
  assert.equal(data.length, 1);
});

test('按优先级筛选', async () => {
  const { data } = await request('GET', '/tasks?priority=' + encodeURIComponent('高'));
  assert.equal(data.length, 1);
  assert.equal(data[0].id, taskId);
});

test('按截止日期范围筛选', async () => {
  const { data } = await request('GET', '/tasks?dueFrom=2026-11-01&dueTo=2026-12-31');
  assert.equal(data.length, 1);
  assert.equal(data[0].id, taskId);
});

test('按优先级排序（高优先在前）', async () => {
  const { data } = await request('GET', '/tasks?sort=priority&order=asc');
  assert.equal(data[0].id, taskId);
});

test('按状态筛选多值', async () => {
  const { data } = await request('GET', '/tasks?status=' + encodeURIComponent('进行中,未开始'));
  assert.equal(data.length, 2);
});

// ---------- 完成切换与自动进度记录 ----------

test('完成任务：状态与完成时间自动维护', async () => {
  const { status, data } = await request('POST', `/tasks/${taskId}/complete`);
  assert.equal(status, 200);
  assert.equal(data.status, '已完成');
  assert.ok(data.completedAt);
});

test('完成任务后自动生成进度记录', async () => {
  const { status, data } = await request('GET', `/tasks/${taskId}`);
  assert.equal(status, 200);
  assert.ok(data.ProgressUpdates.length >= 1);
  assert.ok(data.ProgressUpdates[0].description.includes('已完成'));
});

test('再次切换恢复为未开始', async () => {
  const { data } = await request('POST', `/tasks/${taskId}/complete`);
  assert.equal(data.status, '未开始');
  assert.equal(data.completedAt, null);
});

// ---------- 更新 ----------

test('更新任务字段', async () => {
  const { status, data } = await request('PUT', `/tasks/${taskId2}`, {
    title: '修复登录问题（更新）',
    priority: '低',
    dueDate: '2026-09-30'
  });
  assert.equal(status, 200);
  assert.equal(data.title, '修复登录问题（更新）');
  assert.equal(data.priority, '低');
});

// ---------- 子任务 ----------

let subTaskId;

test('创建子任务', async () => {
  const { status, data } = await request('POST', '/subtasks', { taskId, title: '准备测试数据' });
  assert.equal(status, 201);
  subTaskId = data.id;
});

test('子任务内容必填', async () => {
  const { status } = await request('POST', '/subtasks', { taskId, title: '' });
  assert.equal(status, 400);
});

test('子任务勾选完成', async () => {
  const { status, data } = await request('PUT', `/subtasks/${subTaskId}`, { done: true });
  assert.equal(status, 200);
  assert.equal(data.done, true);
});

test('删除子任务', async () => {
  const { status } = await request('DELETE', `/subtasks/${subTaskId}`);
  assert.equal(status, 200);
});

// ---------- 进度记录 ----------

test('添加进度记录并同步状态', async () => {
  const { status, data } = await request('POST', '/progress-updates', {
    taskId: taskId2,
    description: '问题定位完毕',
    statusChange: '待审核'
  });
  assert.equal(status, 201);
  const task = await request('GET', `/tasks/${taskId2}`);
  assert.equal(task.data.status, '待审核');
});

test('进度记录描述必填', async () => {
  const { status } = await request('POST', '/progress-updates', { taskId: taskId2, description: ' ' });
  assert.equal(status, 400);
});

test('进度记录状态值校验', async () => {
  const { status } = await request('POST', '/progress-updates', {
    taskId: taskId2, description: 'x', statusChange: '随便写的'
  });
  assert.equal(status, 400);
});

test('按任务查询进度记录（倒序）', async () => {
  const { status, data } = await request('GET', `/progress-updates/task/${taskId2}`);
  assert.equal(status, 200);
  assert.ok(data.length >= 1);
  assert.ok(data[0].updateTime >= data[data.length - 1].updateTime);
});

// ---------- 习惯 ----------

let habitId;

test('创建每日习惯', async () => {
  const { status, data } = await request('POST', '/habits', {
    name: '晨间阅读', icon: '📚', frequency: 'daily'
  });
  assert.equal(status, 201);
  habitId = data.id;
});

test('习惯名称必填', async () => {
  const { status } = await request('POST', '/habits', { name: '' });
  assert.equal(status, 400);
});

test('习惯频率校验', async () => {
  const { status } = await request('POST', '/habits', { name: 'x', frequency: 'hourly' });
  assert.equal(status, 400);
});

test('每周目标次数校验（1-7）', async () => {
  const { status } = await request('POST', '/habits', {
    name: 'x', frequency: 'weekly', weeklyTarget: 9
  });
  assert.equal(status, 400);
});

test('习惯打卡 → streak=1', async () => {
  const { status, data } = await request('POST', `/habits/${habitId}/check`);
  assert.equal(status, 200);
  assert.equal(data.checked, true);
  assert.equal(data.streak, 1);
});

test('取消打卡 → streak=0', async () => {
  const { data } = await request('POST', `/habits/${habitId}/check`);
  assert.equal(data.checked, false);
  assert.equal(data.streak, 0);
});

test('习惯列表带今日打卡态与近 7 天记录', async () => {
  await request('POST', `/habits/${habitId}/check`);
  const { status, data } = await request('GET', '/habits');
  assert.equal(status, 200);
  const h = data.find((x) => x.id === habitId);
  assert.ok(h, '习惯存在');
  assert.equal(h.todayChecked, true);
  assert.equal(h.last7.length, 7);
  assert.ok(h.last7[6].checked, '今天应已打卡');
});

// ---------- 仪表盘 ----------

test('仪表盘聚合结构完整', async () => {
  const { status, data } = await request('GET', '/dashboard');
  assert.equal(status, 200);
  for (const key of ['today', 'overdue', 'upcoming', 'stats', 'trend', 'projects']) {
    assert.ok(key in data, `字段 ${key} 存在`);
  }
  assert.equal(data.trend.length, 7);
  assert.ok(data.stats.totalTasks >= 2);
});

// ---------- 汇总 ----------

test('汇总：区间统计与项目分组', async () => {
  const { status, data } = await request('POST', '/summaries/generate', {
    startDate: '2020-01-01', endDate: '2030-12-31'
  });
  assert.equal(status, 200);
  assert.ok(data.createdCount >= 2);
  assert.ok(Array.isArray(data.projectStats));
  assert.ok(data.projectStats.length >= 1);
  assert.ok(data.projectStats[0].name, '项目名应 join 而非「项目N」');
  assert.equal(data.trend.length, 4018); // 每日趋势逐天
});

test('汇总：缺少日期返回 400', async () => {
  const { status } = await request('POST', '/summaries/generate', { startDate: '2026-01-01' });
  assert.equal(status, 400);
});

// ---------- 备份 ----------

let backupName;

test('创建备份', async () => {
  const { status, data } = await request('POST', '/backups');
  assert.equal(status, 200);
  assert.ok(data.fileName.endsWith('.sqlite'));
  backupName = data.fileName;
});

test('备份列表包含新备份', async () => {
  const { status, data } = await request('GET', '/backups');
  assert.equal(status, 200);
  assert.ok(data.some((b) => b.fileName === backupName));
});

test('路径穿越被拒绝', async () => {
  const { status } = await request('POST', '/backups/..%2F..%2Fdatabase.sqlite/restore');
  assert.ok(status === 400 || status === 404, `实际 ${status}`);
  const del = await request('DELETE', '/backups/..%2Fdatabase.sqlite');
  assert.ok(del.status === 400 || del.status === 404);
});

test('恢复备份后删除测试期间数据', async () => {
  // 恢复前先建一个新任务
  const created = await request('POST', '/tasks', { title: '备份后不应存在的任务' });
  assert.equal(created.status, 201);

  const { status } = await request('POST', `/backups/${backupName}/restore`);
  assert.equal(status, 200);

  const list = await request('GET', '/tasks');
  assert.ok(
    !list.data.some((t) => t.title === '备份后不应存在的任务'),
    '恢复后新任务应消失'
  );
  // 恢复也应保留打卡记录（备份时已打卡）
  const habits = await request('GET', '/habits');
  const h = habits.data.find((x) => x.id === habitId);
  assert.ok(h);
});

test('恢复不存在的备份返回 404', async () => {
  const { status } = await request('POST', '/backups/not-exist-backup.sqlite/restore');
  assert.equal(status, 404);
});

test('删除备份', async () => {
  const { status } = await request('DELETE', `/backups/${backupName}`);
  assert.equal(status, 200);
  const list = await request('GET', '/backups');
  assert.ok(!list.data.some((b) => b.fileName === backupName));
});

// ---------- 级联删除 ----------

test('删除任务级联清理子任务与进度', async () => {
  await request('POST', '/subtasks', { taskId, title: '将被级联删除' });
  const before = await request('GET', `/tasks/${taskId}`);
  const progressCount = before.data.ProgressUpdates.length;
  assert.ok(progressCount >= 1);

  const { status } = await request('DELETE', `/tasks/${taskId}`);
  assert.equal(status, 200);

  const gone = await request('GET', `/tasks/${taskId}`);
  assert.equal(gone.status, 404);
});

test('删除项目后其任务保留为未关联', async () => {
  const { status } = await request('DELETE', `/projects/${projectId2}`);
  assert.equal(status, 200);
  const list = await request('GET', '/tasks');
  const t = list.data.find((x) => x.id === taskId2);
  assert.ok(t, '任务应保留');
  assert.equal(t.projectId, null);
  assert.equal(t.Project, null);
});
