import { Response, NextFunction } from 'express';
import { DailyReport } from '../models/report.model';
import { ReportService } from '../services/report.service';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Types } from 'mongoose';

export const getDailyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const date = req.query.date as string; // YYYY-MM-DD

  if (!date) {
    return next(new AppError('Date parameter is required', 400));
  }

  // Find the report
  let report: any = await DailyReport.findOne({ userId: new Types.ObjectId(userId), date });

  // If no locked report exists, generate one dynamically on the fly as a preview/draft
  if (!report) {
    const draftReport = await ReportService.generateDailyReport(userId, date);
    if (!draftReport) {
      return res.status(200).json({
        success: true,
        date,
        report: null, // No activities recorded, so no report
      });
    }
    report = draftReport;
  }

  res.status(200).json({
    success: true,
    date,
    report,
  });
});

export const getCalendarStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const yearMonth = req.query.yearMonth as string; // YYYY-MM

  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    return next(new AppError('yearMonth parameter (YYYY-MM) is required', 400));
  }

  const startStr = `${yearMonth}-01`;
  const endStr = `${yearMonth}-31`; // Query range

  const reports = await DailyReport.find({
    userId: new Types.ObjectId(userId),
    date: { $gte: startStr, $lte: endStr },
  }).select('date productivityScore totalLoggedTime');

  // Format data for the calendar
  const calendarData = reports.map((r) => {
    let color: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
    if (r.totalLoggedTime > 0) {
      if (r.productivityScore >= 70) {
        color = 'green';
      } else if (r.productivityScore >= 40) {
        color = 'yellow';
      } else {
        color = 'red';
      }
    }
    return {
      date: r.date,
      score: r.productivityScore,
      color,
    };
  });

  res.status(200).json({
    success: true,
    yearMonth,
    calendar: calendarData,
  });
});

export const getWeeklySummary = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const endDate = req.query.endDate as string; // YYYY-MM-DD

  if (!endDate) {
    return next(new AppError('endDate parameter is required', 400));
  }

  const summary = await ReportService.getWeeklySummary(userId, endDate);

  res.status(200).json({
    success: true,
    summary,
  });
});

export const getMonthlySummary = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = (req.user!._id as any).toString();
  const yearMonth = req.query.yearMonth as string; // YYYY-MM

  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    return next(new AppError('yearMonth parameter (YYYY-MM) is required', 400));
  }

  const summary = await ReportService.getMonthlySummary(userId, yearMonth);

  res.status(200).json({
    success: true,
    summary,
  });
});
