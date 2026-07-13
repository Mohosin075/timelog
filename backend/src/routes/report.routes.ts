import { Router } from 'express';
import {
  getDailyReport,
  getCalendarStatus,
  getWeeklySummary,
  getMonthlySummary,
} from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Protect all routes
router.use(protect as any);

router.get('/daily', getDailyReport as any);
router.get('/calendar', getCalendarStatus as any);
router.get('/weekly', getWeeklySummary as any);
router.get('/monthly', getMonthlySummary as any);

export default router;
