# 个人规划中心 v2.0

一个界面美观、功能全面、开箱即用的**本地个人规划工具**：任务管理、看板、日历、四象限、项目、习惯打卡、番茄专注、统计报告、数据备份，一应俱全。数据 100% 存储在本地 SQLite，无任何云端依赖。

> v2.0 是对 v1「个人工作事项管理工具」的全面重构，功能设计参考了 Todoist、滴答清单、Things 3 等主流效率工具（调研与设计决策见 `docs/`）。

## ✨ 功能总览

| 模块 | 亮点 |
|---|---|
| 🏠 仪表盘 | 时段问候、今日聚焦、逾期提醒、近 7 天完成趋势图、项目进度条 |
| ✅ 任务 | **快速添加**：`明天 写周报 #项目 @标签 !1` 自然语言解析；分组列表、筛选排序、标签、子任务清单、详情侧滑面板（自动保存 + 进度时间线） |
| 📊 四视图 | 列表（按日期/项目/状态分组）、**看板拖拽**、月历、四象限（紧急×重要） |
| 📁 项目 | 颜色标识、任务完成进度、一键筛选项目任务 |
| 🔁 习惯打卡 | 每日/每周频率、连续天数 🔥、近 7 天打卡格 |
| ⏱ 番茄专注 | 25/5 圆环倒计时、关联任务、今日番茄计数 |
| 📈 统计报告 | 时间范围汇总、趋势/分布图表、**导出 Excel**、**打印/导出 PDF**（中文无乱码） |
| 💾 数据备份 | 一键备份、安全恢复（在线导入，不覆盖运行中文件）、删除 |
| 🌙 体验 | 深/浅/跟随系统三态主题、Toast 反馈、骨架屏、空状态、快捷键（`N` 新建、`/` 搜索、`Esc` 关闭）、响应式布局 |

## 🚀 快速开始

### 方式一：一键启动（开发模式，Windows）

1. 双击运行 `start.bat` —— 自动安装依赖并分别启动前后端
2. 打开 http://localhost:5173

### 方式二：手动启动（开发模式）

```bash
# 终端 1：后端（端口 3001）
cd backend && npm install && npm start

# 终端 2：前端（端口 5173，/api 自动代理到 3001）
cd frontend && npm install && npm run dev
```

打开 http://localhost:5173

### 方式三：生产模式（单端口）

```bat
:: 1. 构建前端 + 安装后端依赖
build.bat

:: 2. 启动（前端由后端托管，访问 http://localhost:3001）
start-prod.bat
```

### 方式四：Docker

```bash
docker compose up -d
# 打开 http://localhost:3001，数据持久化在命名卷 planner-data
```

## 🧪 测试

```bash
cd backend
npm test        # 51 个 API 自动化用例（自起临时数据库，不影响真实数据）
```

前端质量保障：`tsc --noEmit` 零错误、ESLint 零告警、`vite build` 构建通过，并经浏览器逐页 GUI 走查（快速添加/看板拖拽/主题切换/打卡/报告/备份均实测）。

## 🗂 项目结构

```
personal_plan/
├── docs/                  # 需求文档 / 技术方案 / 交互设计
├── backend/               # Express 5 + Sequelize + SQLite
│   ├── src/
│   │   ├── config/        # 数据库连接（路径不依赖启动目录）
│   │   ├── controllers/   # 任务/子任务/项目/进度/习惯/仪表盘/汇总/备份
│   │   ├── models/        # Task(含标签/子任务关联) Project SubTask Habit HabitRecord
│   │   ├── middleware/    # 统一错误处理
│   │   ├── routes/
│   │   └── index.ts       # 入口（生产模式托管前端 SPA）
│   ├── test/api.test.mjs  # API 自动化测试
│   └── database.sqlite    # 本地数据（不入 git）
├── frontend/              # React 19 + Vite + Tailwind CSS 4
│   └── src/
│   ├── api/               # 统一 fetch 客户端
│   ├── components/        # UI 基础组件 + 布局 + 任务模块(解析器/快速添加/侧滑面板/四视图)
│   ├── hooks/             # 主题 / Toast
│   └── pages/             # 仪表盘 任务 项目 习惯 番茄 报告 备份 设置 404
├── start.bat              # 开发模式一键启动
├── build.bat              # 生产构建
├── start-prod.bat         # 生产模式启动
├── Dockerfile / docker-compose.yml
└── README.md
```

## 📖 使用技巧

- **快速添加语法**：`今天|明天|后天|下周X|周X|N月N日|YYYY-MM-DD` 识别日期；`#项目名` 关联项目（支持模糊匹配）；`@标签` 添加标签；`!1/!2/!3` 设置高/中/低优先级。例：`周五 团队复盘 #固件开发 @例会 !2`
- **看板**：拖拽卡片跨列即改状态，状态变化自动写入任务进度时间线
- **四象限**：紧急 = 今天或已逾期，重要 = 高优先级；点卡片打开详情可调整归属
- **任务详情**：所有字段修改即时保存；子任务支持勾选进度条；进度记录展示完整状态历史
- **习惯**：连续天数按「当天未打不断签」计算；每周习惯按周达标周数计算
- **数据安全**：升级/备份/恢复均保留 v1 数据；备份恢复采用在线导入，不会损坏运行中的数据库

## 🔧 技术栈

- **前端**：React 19、TypeScript、Vite、Tailwind CSS 4（CSS 变量双主题）、Recharts、@dnd-kit、date-fns、lucide-react
- **后端**：Node.js、Express 5、TypeScript、Sequelize 6、SQLite
- **测试**：Node.js 内置 test runner（51 用例）
- **部署**：Windows 脚本 / Docker（健康检查 + 数据卷）

## 升级说明（v1 → v2）

启动 v2 后自动迁移：旧项目/任务/进度全部保留，任务自动补充标签、完成时间等新字段，无需手动操作。数据库与备份文件已移出版本库（`.gitignore` 管理）。

## 许可证

MIT License
