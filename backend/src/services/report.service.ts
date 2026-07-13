import { Activity, IActivity } from '../models/activity.model';
import { DailyReport, IDailyReport } from '../models/report.model';
import { Types } from 'mongoose';

// Helper to convert "HH:MM" to minutes
export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper to format minutes to "Xh Ym" or "Xh" or "Ym"
export const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export class ReportService {
  /**
   * Generates or updates a daily report for a user on a specific date.
   */
  public static async generateDailyReport(userId: string, date: string): Promise<IDailyReport | null> {
    // Find all activities for the user on this date, sorted by start time
    const activities = await Activity.find({ userId: new Types.ObjectId(userId), date }).sort({ startTime: 1 });

    if (activities.length === 0) {
      // Delete report if no activities left
      await DailyReport.deleteOne({ userId: new Types.ObjectId(userId), date });
      return null;
    }

    let totalLoggedTime = 0;
    let workTime = 0;
    let learningTime = 0;
    let healthTime = 0;
    let personalTime = 0;
    let distractionTime = 0;
    let sleepTime = 0;
    
    let longestFocusDuration = 0;
    let longestFocusActivity = '';
    
    let validSessionCount = 0;
    let totalSessionDuration = 0;
    
    let largestDistractionDuration = 0;
    let largestDistractionActivity = '';

    activities.forEach((act) => {
      if (act.duration !== undefined) {
        const dur = act.duration;
        totalLoggedTime += dur;
        validSessionCount++;
        totalSessionDuration += dur;

        // Categorize time
        switch (act.category) {
          case 'Work':
            workTime += dur;
            break;
          case 'Learning':
            learningTime += dur;
            break;
          case 'Health':
            healthTime += dur;
            break;
          case 'Personal':
            personalTime += dur;
            break;
          case 'Distraction':
            distractionTime += dur;
            // Tracks the largest distraction activity name and duration
            if (dur > largestDistractionDuration) {
              largestDistractionDuration = dur;
              largestDistractionActivity = act.activity;
            }
            break;
          case 'Sleep':
            sleepTime += dur;
            break;
        }

        // Longest Focus Session check (Work, Learning, Health)
        if (['Work', 'Learning', 'Health'].includes(act.category)) {
          if (dur > longestFocusDuration) {
            longestFocusDuration = dur;
            longestFocusActivity = act.activity;
          }
        }
      }
    });

    // If no focus session in productive categories, find longest session in general (except Sleep and Distraction)
    if (longestFocusDuration === 0) {
      activities.forEach((act) => {
        if (act.duration !== undefined && !['Sleep', 'Distraction'].includes(act.category)) {
          if (act.duration > longestFocusDuration) {
            longestFocusDuration = act.duration;
            longestFocusActivity = act.activity;
          }
        }
      });
    }

    // Productive time: Work + Learning + Health
    const productiveTime = workTime + learningTime + healthTime;
    
    // Productivity Score = (Productive Time / Total Logged Time) * 100
    const productivityScore = totalLoggedTime > 0 
      ? Math.round((productiveTime / totalLoggedTime) * 100) 
      : 0;

    // Average Session Length
    const averageSession = validSessionCount > 0 
      ? Math.round(totalSessionDuration / validSessionCount) 
      : 0;

    // Activity switches
    const activitySwitches = activities.length > 0 ? activities.length : 0;

    // Calculate free/unlogged gaps between activities
    let unloggedTime = 0;
    for (let i = 0; i < activities.length - 1; i++) {
      const currentAct = activities[i];
      const nextAct = activities[i + 1];

      if (currentAct.endTime && nextAct.startTime) {
        const currentEndMin = timeToMinutes(currentAct.endTime);
        const nextStartMin = timeToMinutes(nextAct.startTime);

        if (nextStartMin > currentEndMin) {
          unloggedTime += (nextStartMin - currentEndMin);
        } else if (nextStartMin < currentEndMin) {
          // If the next start time is smaller, it means it spans across the midnight boundary
          unloggedTime += (nextStartMin + 24 * 60 - currentEndMin);
        }
      }
    }

    // Upsert the daily report
    const reportData = {
      userId: new Types.ObjectId(userId),
      date,
      totalLoggedTime,
      productiveTime,
      productivityScore,
      workTime,
      learningTime,
      personalTime,
      healthTime,
      distractionTime,
      sleepTime,
      longestFocusSession: {
        activity: longestFocusActivity || 'None',
        duration: longestFocusDuration,
      },
      averageSession,
      activitySwitches,
      unloggedTime,
      generatedAt: new Date(),
    };

    const report = await DailyReport.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), date },
      reportData,
      { new: true, upsert: true }
    );

    return report;
  }

  /**
   * Returns productivity analytics summary (weekly).
   */
  public static async getWeeklySummary(userId: string, endDateStr: string): Promise<any> {
    const end = new Date(endDateStr);
    const start = new Date(end);
    start.setDate(end.getDate() - 6); // 7 days window

    const startDateStr = start.toISOString().split('T')[0];

    const reports = await DailyReport.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: startDateStr, $lte: endDateStr },
    });

    if (reports.length === 0) {
      return {
        avgProductivity: 0,
        mostProductiveDay: 'N/A',
        avgWorkTime: 0,
        avgLearningTime: 0,
        avgDistractionTime: 0,
      };
    }

    let totalProdScore = 0;
    let totalWork = 0;
    let totalLearning = 0;
    let totalDistraction = 0;
    
    // Track productivity per day of the week
    const weekdayProductivity: Record<number, { sum: number; count: number }> = {};

    reports.forEach((rep) => {
      totalProdScore += rep.productivityScore;
      totalWork += rep.workTime;
      totalLearning += rep.learningTime;
      totalDistraction += rep.distractionTime;

      // Determine day of the week
      const dayOfWeek = new Date(rep.date).getDay(); // 0 is Sunday, 1 is Monday...
      if (!weekdayProductivity[dayOfWeek]) {
        weekdayProductivity[dayOfWeek] = { sum: 0, count: 0 };
      }
      weekdayProductivity[dayOfWeek].sum += rep.productivityScore;
      weekdayProductivity[dayOfWeek].count += 1;
    });

    const numDays = reports.length;
    const daysName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let bestDayIndex = -1;
    let maxAvgScore = -1;
    
    Object.entries(weekdayProductivity).forEach(([day, data]) => {
      const avg = data.sum / data.count;
      if (avg > maxAvgScore) {
        maxAvgScore = avg;
        bestDayIndex = Number(day);
      }
    });

    return {
      avgProductivity: Math.round(totalProdScore / numDays),
      mostProductiveDay: bestDayIndex !== -1 ? daysName[bestDayIndex] : 'N/A',
      avgWorkTime: Math.round(totalWork / numDays),
      avgLearningTime: Math.round(totalLearning / numDays),
      avgDistractionTime: Math.round(totalDistraction / numDays),
    };
  }

  /**
   * Returns productivity analytics summary (monthly).
   */
  public static async getMonthlySummary(userId: string, yearMonth: string): Promise<any> {
    // yearMonth is like "2026-07"
    const startStr = `${yearMonth}-01`;
    const endStr = `${yearMonth}-31`; // Let MongoDB handle bounds safely

    const reports = await DailyReport.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: startStr, $lte: endStr },
    });

    if (reports.length === 0) {
      return {
        avgProductivity: 0,
        totalWorkHours: 0,
        totalLearningHours: 0,
        totalDistractionHours: 0,
        mostActiveCategory: 'N/A',
        mostProductiveDay: 'N/A',
      };
    }

    let totalProdScore = 0;
    let totalWork = 0;
    let totalLearning = 0;
    let totalDistraction = 0;
    
    // Category aggregates
    const categoryTotals = {
      Work: 0,
      Learning: 0,
      Health: 0,
      Personal: 0,
      Distraction: 0,
      Sleep: 0,
    };

    const weekdayProductivity: Record<number, { sum: number; count: number }> = {};

    reports.forEach((rep) => {
      totalProdScore += rep.productivityScore;
      totalWork += rep.workTime;
      totalLearning += rep.learningTime;
      totalDistraction += rep.distractionTime;

      categoryTotals.Work += rep.workTime;
      categoryTotals.Learning += rep.learningTime;
      categoryTotals.Health += rep.healthTime;
      categoryTotals.Personal += rep.personalTime;
      categoryTotals.Distraction += rep.distractionTime;
      categoryTotals.Sleep += rep.sleepTime;

      const dayOfWeek = new Date(rep.date).getDay();
      if (!weekdayProductivity[dayOfWeek]) {
        weekdayProductivity[dayOfWeek] = { sum: 0, count: 0 };
      }
      weekdayProductivity[dayOfWeek].sum += rep.productivityScore;
      weekdayProductivity[dayOfWeek].count += 1;
    });

    // Most active category
    let mostActiveCategory = 'N/A';
    let maxCategoryTime = -1;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > maxCategoryTime) {
        maxCategoryTime = val;
        mostActiveCategory = cat;
      }
    });

    // Most productive day
    const daysName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let bestDayIndex = -1;
    let maxAvgScore = -1;
    Object.entries(weekdayProductivity).forEach(([day, data]) => {
      const avg = data.sum / data.count;
      if (avg > maxAvgScore) {
        maxAvgScore = avg;
        bestDayIndex = Number(day);
      }
    });

    return {
      avgProductivity: Math.round(totalProdScore / reports.length),
      totalWorkHours: Math.round((totalWork / 60) * 10) / 10, // Round to 1 decimal place
      totalLearningHours: Math.round((totalLearning / 60) * 10) / 10,
      totalDistractionHours: Math.round((totalDistraction / 60) * 10) / 10,
      mostActiveCategory,
      mostProductiveDay: bestDayIndex !== -1 ? daysName[bestDayIndex] : 'N/A',
    };
  }
}
