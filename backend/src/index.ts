import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { initDatabase } from './models';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', routes);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 生产模式：托管前端构建产物（SPA 回退）。__dirname 为 backend/src 或 backend/dist，上两级即项目根
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../..', 'frontend/dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, {
      setHeaders(res, filePath) {
        // HTML 入口不缓存，保证前端发版后手机浏览器立刻拿到新版本
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      }
    }));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(distDir, 'index.html'));
        return;
      }
      next();
    });
  }
}

app.use(errorHandler);

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`✅ 个人规划中心服务已启动: http://localhost:${port}`);
      console.log(`   API 概览: http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
