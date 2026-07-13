import { Router } from 'express';
import authRoutes from './auth.routes';
import activityRoutes from './activity.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/activities', activityRoutes);
router.use('/reports', reportRoutes);

export default router;
