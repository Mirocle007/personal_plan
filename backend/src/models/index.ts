import sequelize from '../config/database';
import Project from './Project';
import Task from './Task';
import ProgressUpdate from './ProgressUpdate';
import SubTask from './SubTask';
import Habit from './Habit';
import HabitRecord from './HabitRecord';
import { PROJECT_COLORS } from '../constants';

// 导出所有模型
export {
  sequelize,
  Project,
  Task,
  ProgressUpdate,
  SubTask,
  Habit,
  HabitRecord
};

/**
 * 初始化数据库：
 * 1. sync() 只创建缺失的新表，不动已有表（避免 SQLite alter 重建表触发外键失败）
 * 2. v2 新增列通过 ALTER TABLE ADD COLUMN 补齐，保留 v1 数据
 */
export const initDatabase = async () => {
  try {
    await sequelize.sync(); // force: false

    const qi = sequelize.getQueryInterface();
    const ensureColumn = async (table: string, column: string, ddl: string) => {
      const desc = (await qi.describeTable(table)) as Record<string, unknown>;
      if (!desc[column]) {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
        console.log(`已为 ${table} 补充列 ${column}`);
      }
    };

    await ensureColumn('Tasks', 'tags', `"tags" JSON DEFAULT '[]'`);
    await ensureColumn('Tasks', 'completedAt', `"completedAt" DATETIME`);
    await ensureColumn('Tasks', 'sortOrder', `"sortOrder" INTEGER NOT NULL DEFAULT 0`);
    await ensureColumn('Projects', 'color', `"color" VARCHAR(255) DEFAULT '${PROJECT_COLORS[0]}'`);

    console.log('数据库表结构初始化成功');
  } catch (error) {
    console.error('数据库表结构初始化失败:', error);
    throw error;
  }
};
