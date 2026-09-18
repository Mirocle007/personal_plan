import express from 'express';
import * as TaskController from '../controllers/TaskController';

const router = express.Router();

router.get('/', TaskController.listTasks);
router.get('/:id', TaskController.getTask);
router.post('/', TaskController.createTask);
router.put('/:id', TaskController.updateTask);
router.post('/:id/complete', TaskController.toggleTaskComplete);
router.delete('/:id', TaskController.deleteTask);

export default router;
