import express from 'express';
import * as SubTaskController from '../controllers/SubTaskController';

const router = express.Router();

router.post('/', SubTaskController.createSubTask);
router.put('/:id', SubTaskController.updateSubTask);
router.delete('/:id', SubTaskController.deleteSubTask);

export default router;
