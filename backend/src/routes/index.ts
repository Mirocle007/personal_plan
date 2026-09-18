import express from 'express';
import projectRoutes from './projectRoutes';
import taskRoutes from './taskRoutes';
import subtaskRoutes from './subtaskRoutes';
import progressUpdateRoutes from './progressUpdateRoutes';
import habitRoutes from './habitRoutes';
import summaryRoutes from './summaryRoutes';
import backupRoutes from './backupRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = express.Router();

// API 概览
router.get('/', (_req, res) => {
  res.json({
    name: '个人规划中心 API',
    version: '2.0',
    endpoints: [
      'GET /api/dashboard',
      'GET|POST /api/tasks, GET|PUT|DELETE /api/tasks/:id, POST /api/tasks/:id/complete',
      'POST /api/subtasks, PUT|DELETE /api/subtasks/:id',
      'GET|POST /api/projects, GET|PUT|DELETE /api/projects/:id',
      'GET /api/progress-updates/task/:taskId, POST /api/progress-updates, DELETE /api/progress-updates/:id',
      'GET|POST /api/habits, PUT|DELETE /api/habits/:id, POST /api/habits/:id/check',
      'POST /api/summaries/generate',
      'GET|POST /api/backups, POST /api/backups/:fileName/restore, DELETE /api/backups/:fileName',
      'GET /api/health'
    ]
  });
});

router.use('/dashboard', dashboardRoutes);
router.use('/tasks', taskRoutes);
router.use('/subtasks', subtaskRoutes);
router.use('/projects', projectRoutes);
router.use('/progress-updates', progressUpdateRoutes);
router.use('/habits', habitRoutes);
router.use('/summaries', summaryRoutes);
router.use('/backups', backupRoutes);

export default router;
