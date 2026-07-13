import { Response, NextFunction } from 'express';
import { Activity, IActivity } from '../models/activity.model';
import { DailyReport } from '../models/report.model';
import { ReportService } from '../services/report.service';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Types } from 'mongoose';

/**
 * Checks past days prior to the client's current date.
 * Automatically generates reports for completed past days.
 * Returns a list of past days that cannot be closed due to missing end times.
 */
const checkAndClosePastDays = async (userId: string, clientLocalDate: string): Promise<any[]> => {
  // Find all activities for the user that occurred before the client's current date
  const pastActivities = await Activity.find({
    userId: new Types.ObjectId(userId),
    date: { $lt: clientLocalDate },
  });

  if (pastActivities.length === 0) {
    return [];
  }

  // Group past activities by date
  const activitiesByDate: Record<string, IActivity[]> = {};
  pastActivities.forEach((act) => {
    if (!activitiesByDate[act.date]) {
      activitiesByDate[act.date] = [];
    }
    activitiesByDate[act.date].push(act);
  });

  const unclosedDays: any[] = [];

  for (const [date, acts] of Object.entries(activitiesByDate)) {
    // Check if report already exists
    const reportExists = await DailyReport.exists({ userId: new Types.ObjectId(userId), date });
    
    if (!reportExists) {
      // Check if any activity is missing an end time
      const missingEndTimeAct = acts.find((a) => !a.endTime);
      
      if (missingEndTimeAct) {
        unclosedDays.push({
          date,
          activityId: missingEndTimeAct._id,
          activityName: missingEndTimeAct.activity,
          startTime: missingEndTimeAct.startTime,
        });
      } else {
        // If all activities have an end time, automatically lock the day and generate the report
        await ReportService.generateDailyReport(userId, date);
      }
    }
  }

  // Sort unclosed days chronologically
  return unclosedDays.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Checks if a specific date is locked (belongs to the past and has a generated daily report).
 */
const isDateLocked = async (userId: string, date: string, clientLocalDate: string): Promise<boolean> => {
  if (date >= clientLocalDate) {
    return false; // Today or future is never locked
  }
  
  // If in the past, check if a report exists
  const reportExists = await DailyReport.exists({ userId: new Types.ObjectId(userId), date });
  return !!reportExists;
};

export const getActivities = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const date = req.query.date as string; // Target date (YYYY-MM-DD)
  const clientLocalDate = (req.query.clientLocalDate as string) || date; // User's today date

  if (!date) {
    return next(new AppError('Date query parameter is required', 400));
  }

  // 1. Run automatic day-closing logic for any past dates
  const unclosedDays = await checkAndClosePastDays(userId, clientLocalDate);

  // 2. Fetch activities for the target date
  const activities = await Activity.find({
    userId: new Types.ObjectId(userId),
    date,
  }).sort({ startTime: 1 });

  // 3. Check if the target date is locked
  const isLocked = await isDateLocked(userId, date, clientLocalDate);

  res.status(200).json({
    success: true,
    date,
    isLocked,
    activities,
    unclosedDays,
  });
});

export const createActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const { date, startTime, endTime, activity, category, notes, clientLocalDate } = req.body;

  if (!date || !startTime || !activity || !category) {
    return next(new AppError('Please provide date, startTime, activity, and category', 400));
  }

  const todayStr = clientLocalDate || new Date().toISOString().split('T')[0];

  // Check if date is locked
  const isLocked = await isDateLocked(userId, date, todayStr);
  if (isLocked) {
    return next(new AppError('This day is closed and locked. You cannot add new activities.', 403));
  }

  const newActivity = await Activity.create({
    userId: new Types.ObjectId(userId),
    date,
    startTime,
    endTime: endTime || undefined,
    activity,
    category,
    notes,
  });

  // If this belongs to a past day and we just finished it, trigger a report update
  if (date < todayStr && endTime) {
    // Check if there are other unclosed activities for this date
    const openActs = await Activity.exists({
      userId: new Types.ObjectId(userId),
      date,
      endTime: { $exists: false },
    });
    if (!openActs) {
      await ReportService.generateDailyReport(userId, date);
    }
  }

  res.status(201).json({
    success: true,
    activity: newActivity,
  });
});

export const updateActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const { id } = req.params;
  const { startTime, endTime, activity, category, notes, clientLocalDate } = req.body;

  const existingActivity = await Activity.findOne({ _id: id, userId: new Types.ObjectId(userId) });
  if (!existingActivity) {
    return next(new AppError('Activity not found', 404));
  }

  const todayStr = clientLocalDate || new Date().toISOString().split('T')[0];

  // Check if date is locked
  const isLocked = await isDateLocked(userId, existingActivity.date, todayStr);
  if (isLocked) {
    return next(new AppError('This day is closed and locked. You cannot modify activities.', 403));
  }

  // Update properties
  if (startTime) existingActivity.startTime = startTime;
  
  // Handle optional/unset endTime
  if (endTime !== undefined) {
    existingActivity.endTime = endTime || undefined;
  }
  
  if (activity) existingActivity.activity = activity;
  if (category) existingActivity.category = category as any;
  if (notes !== undefined) existingActivity.notes = notes;

  await existingActivity.save();

  // If the activity is on a past day and was updated, check if we can close it
  if (existingActivity.date < todayStr) {
    const hasOpenActivities = await Activity.exists({
      userId: new Types.ObjectId(userId),
      date: existingActivity.date,
      $or: [{ endTime: { $exists: false } }, { endTime: '' }],
    });
    if (!hasOpenActivities) {
      await ReportService.generateDailyReport(userId, existingActivity.date);
    }
  }

  res.status(200).json({
    success: true,
    activity: existingActivity,
  });
});

export const deleteActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const { id } = req.params;
  const { clientLocalDate } = req.query;

  const existingActivity = await Activity.findOne({ _id: id, userId: new Types.ObjectId(userId) });
  if (!existingActivity) {
    return next(new AppError('Activity not found', 404));
  }

  const todayStr = (clientLocalDate as string) || new Date().toISOString().split('T')[0];

  // Check if date is locked
  const isLocked = await isDateLocked(userId, existingActivity.date, todayStr);
  if (isLocked) {
    return next(new AppError('This day is closed and locked. You cannot delete activities.', 403));
  }

  const date = existingActivity.date;
  await Activity.deleteOne({ _id: id });

  // Update/re-generate report if necessary
  if (date < todayStr) {
    await ReportService.generateDailyReport(userId, date);
  }

  res.status(200).json({
    success: true,
    message: 'Activity deleted successfully',
  });
});

export const searchActivities = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const query = req.query.q as string;

  if (!query) {
    return next(new AppError('Search query parameter "q" is required', 400));
  }

  // Find activities matching text search or regex on activity name
  const activities = await Activity.find({
    userId: new Types.ObjectId(userId),
    $or: [
      { activity: { $regex: query, $options: 'i' } },
      { notes: { $regex: query, $options: 'i' } },
    ],
  }).sort({ date: -1, startTime: -1 });

  res.status(200).json({
    success: true,
    query,
    results: activities,
  });
});
