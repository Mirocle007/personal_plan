import express from 'express';
import * as ProgressUpdateController from '../controllers/ProgressUpdateController';

const router = express.Router();

router.get('/task/:taskId', ProgressUpdateController.getTaskUpdates);
router.post('/', ProgressUpdateController.createProgressUpdate);
router.delete('/:id', ProgressUpdateController.deleteProgressUpdate);

export default router;
