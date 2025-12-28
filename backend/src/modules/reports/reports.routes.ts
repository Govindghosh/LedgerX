import { Router } from 'express';
import * as reportController from './reports.controller';

const router = Router();

router.get('/daily', reportController.getDailyReport);
router.get('/charts', reportController.getChartData);

export default router;
