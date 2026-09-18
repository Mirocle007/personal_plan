import express from 'express';
import { getDashboard } from '../controllers/DashboardController';

const router = express.Router();

router.get('/', getDashboard);

export default router;
