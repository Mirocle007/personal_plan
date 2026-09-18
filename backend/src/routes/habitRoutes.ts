import express from 'express';
import * as HabitController from '../controllers/HabitController';

const router = express.Router();

router.get('/', HabitController.listHabits);
router.post('/', HabitController.createHabit);
router.put('/:id', HabitController.updateHabit);
router.delete('/:id', HabitController.deleteHabit);
router.post('/:id/check', HabitController.toggleCheck);

export default router;
