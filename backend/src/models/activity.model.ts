import { Schema, model, Document, Types } from 'mongoose';

export type ActivityCategory = 'Work' | 'Learning' | 'Health' | 'Personal' | 'Distraction' | 'Sleep';

export interface IActivity extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string; // HH:MM
  duration?: number; // duration in minutes
  activity: string;
  category: ActivityCategory;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
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
    startTime: {
      type: String,
      required: [true, 'Start time (HH:MM) is required'],
      match: [/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      match: [/^([0-1]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:MM format'],
    },
    duration: {
      type: Number,
    },
    activity: {
      type: String,
      required: [true, 'Activity name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Work', 'Learning', 'Health', 'Personal', 'Distraction', 'Sleep'],
        message: '{VALUE} is not a valid category',
      },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for fast queries by user and date
activitySchema.index({ userId: 1, date: 1 });
activitySchema.index({ userId: 1, activity: 'text' }); // Text search index

// Pre-save hook to calculate duration automatically if both startTime and endTime are present
activitySchema.pre<IActivity>('save', function (next) {
  if (this.startTime && this.endTime) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    
    let startMin = startH * 60 + startM;
    let endMin = endH * 60 + endM;
    
    let diff = endMin - startMin;
    if (diff < 0) {
      // Crosses midnight
      diff += 24 * 60;
    }
    
    this.duration = diff;
  } else {
    this.duration = undefined; // No duration yet if endTime is missing
  }
  next();
});

export const Activity = model<IActivity>('Activity', activitySchema);
