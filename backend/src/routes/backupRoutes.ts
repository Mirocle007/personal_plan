import express from 'express';
import * as BackupController from '../controllers/BackupController';

const router = express.Router();

router.get('/', BackupController.listBackups);
router.post('/', BackupController.createBackup);
router.post('/:fileName/restore', BackupController.restoreBackup);
router.delete('/:fileName', BackupController.deleteBackup);

export default router;
