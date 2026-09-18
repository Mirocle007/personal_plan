/** 快速添加自然语言解析器（参考 Todoist 语法）：
 *  输入示例：明天下午 提交周报 #固件开发 @汇报 !1
 *  支持：今天/明天/后天/大后天/下周X/周X/星期X/N月N日/YYYY-MM-DD/M-D
 *        #项目名（自动匹配现有项目）、@标签（可多个）、!1/!2/!3 或 p1/p2/p3 优先级
 */

export interface ParsedTask {
  title: string;
  dueDate: string | null; // YYYY-MM-DD
  dateLabel: string | null;
  priority: '高' | '中' | '低' | null;
  tags: string[];
  projectId: number | null;
  projectName: string | null;
}

interface ProjectLite {
  id: number;
  name: string;
}

const WEEKDAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 距今最近的指定星期几；nextWeek 为真时再加一周 */
const nextDow = (dow: number, nextWeek: boolean): Date => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  let delta = (dow - d.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  if (nextWeek) delta += 7;
  d.setDate(d.getDate() + delta);
  return d;
};

const parseDateToken = (token: string): { date: string; label: string } | null => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const add = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  };

  if (token === '今天') return { date: fmt(now), label: '今天' };
  if (token === '明天') return { date: fmt(add(1)), label: '明天' };
  if (token === '后天') return { date: fmt(add(2)), label: '后天' };
  if (token === '大后天') return { date: fmt(add(3)), label: '大后天' };

  const nw = token.match(/^下周([一二三四五六日天])$/);
  if (nw) {
    const d = nextDow(WEEKDAYS[nw[1]], true);
    return { date: fmt(d), label: `下周${'日一二三四五六'[d.getDay()]}` };
  }
  const wk = token.match(/^(?:周|星期)([一二三四五六日天])$/);
  if (wk) {
    const d = nextDow(WEEKDAYS[wk[1]], false);
    return { date: fmt(d), label: `周${'日一二三四五六'[d.getDay()]}` };
  }
  const md = token.match(/^(\d{1,2})月(\d{1,2})[日号]$/);
  if (md) {
    let year = now.getFullYear();
    const d = new Date(year, Number(md[1]) - 1, Number(md[2]), 12);
    if (d < now) d.setFullYear(++year); // 已过的日期默认明年
    return { date: fmt(d), label: `${Number(md[1])}月${Number(md[2])}日` };
  }
  const ymd = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12);
    if (!isNaN(d.getTime())) return { date: fmt(d), label: fmt(d) };
    return null;
  }
  const md2 = token.match(/^(\d{1,2})-(\d{1,2})$/);
  if (md2) {
    let year = now.getFullYear();
    const d = new Date(year, Number(md2[1]) - 1, Number(md2[2]), 12);
    if (isNaN(d.getTime())) return null;
    if (d < now) d.setFullYear(++year);
    return { date: fmt(d), label: `${Number(md2[1])}月${Number(md2[2])}日` };
  }
  return null;
};

const PRIORITY_MAP: Record<string, '高' | '中' | '低'> = { '1': '高', '2': '中', '3': '低' };

export function parseQuickAdd(text: string, projects: ProjectLite[] = []): ParsedTask {
  let rest = text;

  // 优先级 !1/!2/!3 或 p1/p2/p3（需要空白边界，避免误伤正文）
  let priority: ParsedTask['priority'] = null;
  const pm = rest.match(/(?:^|\s)[!！pP]([123])(?=\s|$)/);
  if (pm) {
    priority = PRIORITY_MAP[pm[1]];
    rest = rest.replace(pm[0], ' ');
  }

  // 日期（优先匹配长 token）
  let dueDate: string | null = null;
  let dateLabel: string | null = null;
  const dateRe =
    /今天|明天|后天|大后天|下周[一二三四五六日天]|星期[一二三四五六日天]|周[一二三四五六日天]|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}[日号]|\d{1,2}-\d{1,2}/;
  const dm = rest.match(dateRe);
  if (dm) {
    const parsed = parseDateToken(dm[0]);
    if (parsed) {
      dueDate = parsed.date;
      dateLabel = parsed.label;
      rest = rest.replace(dm[0], ' ');
    }
  }

  // 项目 #xxx：精确匹配 → 包含匹配
  let projectId: number | null = null;
  let projectName: string | null = null;
  const projectMatch = rest.match(/#([\w\u4e00-\u9fa5-]+)/);
  if (projectMatch) {
    const token = projectMatch[1];
    const hit =
      projects.find((p) => p.name === token) ??
      projects.find((p) => p.name.includes(token) || token.includes(p.name));
    if (hit) {
      projectId = hit.id;
      projectName = hit.name;
    }
    rest = rest.replace(projectMatch[0], ' ');
  }

  // 标签 @xxx（可多个）
  const tags: string[] = [];
  rest = rest.replace(/@([\w\u4e00-\u9fa5-]+)/g, (_, tag: string) => {
    tags.push(tag);
    return ' ';
  });

  const title = rest.replace(/\s+/g, ' ').trim();
  return { title, dueDate, dateLabel, priority, tags, projectId, projectName };
}
