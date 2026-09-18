import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import sequelize from '../config/database';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { Request, Response } from 'express';
import { param } from '../utils/params';

const DB_FILE = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.resolve(__dirname, '../../database.sqlite');
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/** 备份文件名白名单校验，杜绝路径穿越 */
const resolveBackupPath = (fileName: string): string => {
  if (!/^[\w][\w.-]*\.sqlite$/.test(fileName) || fileName.includes('..')) {
    throw new ApiError(400, '备份文件名不合法');
  }
  const p = path.join(BACKUP_DIR, fileName);
  if (!p.startsWith(BACKUP_DIR)) throw new ApiError(400, '备份文件名不合法');
  return p;
};

// GET /api/backups
export const listBackups = asyncHandler(async (_req: Request, res: Response) => {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sqlite') && !f.startsWith('restore-'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        fileName: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(files);
});

// POST /api/backups —— 优先 VACUUM INTO（一致性快照），不支持时回退文件复制
export const createBackup = asyncHandler(async (_req: Request, res: Response) => {
  if (!fs.existsSync(DB_FILE)) throw new ApiError(404, '数据库文件不存在');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  try {
    await sequelize.query(`VACUUM INTO '${backupPath.replace(/\\/g, '/').replace(/'/g, "''")}'`);
  } catch {
    fs.copyFileSync(DB_FILE, backupPath);
  }

  res.json({ message: '备份创建成功', fileName: backupFileName });
});

/** 从备份文件读出全部表数据，替换当前库内容（在线安全恢复，不覆盖文件） */
const importFromBackup = (backupPath: string) =>
  new Promise<void>((resolve, reject) => {
    const src = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(new ApiError(400, '备份文件无法读取'));
    });

    const all = <T>(sql: string, params: unknown[] = []) =>
      new Promise<T[]>((resolve2, reject2) =>
        src.all(sql, params, (e, rows) => (e ? reject2(e) : resolve2(rows as T[])))
      );

    (async () => {
      const TABLES = [
        'Projects',
        'Tasks',
        'SubTasks',
        'ProgressUpdates',
        'Habits',
        'HabitRecords'
      ];
      const existing = (await all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN (" +
          TABLES.map(() => '?').join(',') +
          ')',
        TABLES
      )).map((r) => r.name);

      await sequelize.transaction(async (t) => {
        // 子表在前删除，父表在前插入
        const deleteOrder = ['HabitRecords', 'Habits', 'SubTasks', 'ProgressUpdates', 'Tasks', 'Projects'];
        for (const table of deleteOrder) {
          if (existing.includes(table)) {
            await sequelize.query(`DELETE FROM "${table}"`, { transaction: t });
          }
        }

        for (const table of ['Projects', 'Tasks', 'SubTasks', 'ProgressUpdates', 'Habits', 'HabitRecords']) {
          if (!existing.includes(table)) continue; // 旧备份没有的新表直接跳过
          const cols = await all<{ name: string }>(`PRAGMA table_info("${table}")`);
          const colNames = cols.map((c) => `"${c.name}"`);
          const rows = await all<Record<string, unknown>>(`SELECT * FROM "${table}"`);
          for (const row of rows) {
            const values = cols.map((c) => row[c.name] ?? null);
            await sequelize.query(
              `INSERT INTO "${table}" (${colNames.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
              { replacements: values, transaction: t }
            );
          }
          // 同步自增序列，避免恢复后再插入时主键冲突
          await sequelize.query(
            `UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM "${table}") WHERE name = '${table}'`,
            { transaction: t }
          );
          await sequelize.query(
            `INSERT INTO sqlite_sequence (name, seq)
             SELECT '${table}', (SELECT COALESCE(MAX(id), 0) FROM "${table}")
             WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = '${table}')`,
            { transaction: t }
          );
        }
      });

      src.close();
      resolve();
    })().catch((e) => {
      src.close();
      reject(e);
    });
  });

// POST /api/backups/:fileName/restore
export const restoreBackup = asyncHandler(async (req: Request, res: Response) => {
  const backupPath = resolveBackupPath(param(req, 'fileName'));
  if (!fs.existsSync(backupPath)) throw new ApiError(404, '备份文件不存在');

  await importFromBackup(backupPath);
  res.json({ message: '数据已从备份恢复，页面即将刷新' });
});

// DELETE /api/backups/:fileName
export const deleteBackup = asyncHandler(async (req: Request, res: Response) => {
  const backupPath = resolveBackupPath(param(req, 'fileName'));
  if (!fs.existsSync(backupPath)) throw new ApiError(404, '备份文件不存在');
  fs.unlinkSync(backupPath);
  res.json({ message: '备份已删除' });
});
