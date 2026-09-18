import path from 'path';
import { Sequelize } from 'sequelize';

// 数据库文件固定在 backend 目录下，避免依赖启动时的工作目录
const storage = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

export default sequelize;
