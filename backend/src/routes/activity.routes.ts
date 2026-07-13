import { Router } from 'express';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  searchActivities,
} from '../controllers/activity.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect as any);

// CRITICAL: /search must be declared before /:id to avoid Express treating "search" as an id param
router.get('/search', searchActivities as any);

router.get('/', getActivities as any);
router.post('/', createActivity as any);
router.put('/:id', updateActivity as any);
router.delete('/:id', deleteActivity as any);

export default router;
