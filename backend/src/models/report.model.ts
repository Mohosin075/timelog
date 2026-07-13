import { Schema, model, Document, Types } from 'mongoose';

export interface IDailyReport extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  totalLoggedTime: number; // minutes
  productiveTime: number; // minutes
  productivityScore: number; // percentage (0 - 100)
  workTime: number; // minutes
  learningTime: number; // minutes
  personalTime: number; // minutes
  healthTime: number; // minutes
  distractionTime: number; // minutes
  sleepTime: number; // minutes
  longestFocusSession: {
    activity: string;
    duration: number; // minutes
  };
  averageSession: number; // minutes
  activitySwitches: number; // number of times activity switched
  unloggedTime: number; // gaps between activities (minutes)
  generatedAt: Date;
}

const dailyReportSchema = new Schema<IDailyReport>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  date: {
    type: String,
    required: [true, 'Date (YYYY-MM-DD) is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
  },
  totalLoggedTime: {
    type: Number,
    required: true,
    default: 0,
  },
  productiveTime: {
    type: Number,
    required: true,
    default: 0,
  },
  productivityScore: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100,
  },
  workTime: {
    type: Number,
    default: 0,
  },
  learningTime: {
    type: Number,
    default: 0,
  },
  personalTime: {
    type: Number,
    default: 0,
  },
  healthTime: {
    type: Number,
    default: 0,
  },
  distractionTime: {
    type: Number,
    default: 0,
  },
  sleepTime: {
    type: Number,
    default: 0,
  },
  longestFocusSession: {
    activity: { type: String, default: '' },
    duration: { type: Number, default: 0 },
  },
  averageSession: {
    type: Number,
    default: 0,
  },
  activitySwitches: {
    type: Number,
    default: 0,
  },
  unloggedTime: {
    type: Number,
    default: 0,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can only have one report per date
dailyReportSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyReport = model<IDailyReport>('DailyReport', dailyReportSchema);
