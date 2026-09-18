import express from 'express';
import * as SummaryController from '../controllers/SummaryController';

const router = express.Router();

router.post('/generate', SummaryController.generateSummary);

export default router;
