'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface IActivity {
  _id: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  activity: string;
  category: string;
}

interface PeakHoursWidgetProps {
  activities: IActivity[];
}

const timeToMins = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export function PeakHoursWidget({ activities }: PeakHoursWidgetProps) {
  const hourlyActiveMinutes = React.useMemo(() => {
    const hours = Array(24).fill(0);
    for (const act of activities) {
      if (!act.startTime || !act.endTime || !act.duration) continue;
      const startM = timeToMins(act.startTime);
      const endM = timeToMins(act.endTime);
      
      let m = startM;
      const limit = endM >= startM ? endM : endM + 24 * 60;
      while (m < limit) {
        const hour = Math.floor((m % (24 * 60)) / 60);
        hours[hour] = (hours[hour] || 0) + 1;
        m++;
      }
    }
    return hours;
  }, [activities]);

  return (
    <div className="card p-5 space-y-4 transition-all duration-300 hover:border-primary/20">
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Peak Focus Hours
        </h3>
        <p className="text-[10px] text-muted mt-0.5">Distribution of focus and logs across the day.</p>
      </div>

      <div className="grid grid-cols-6 gap-1.5 pt-1">
        {hourlyActiveMinutes.map((mins, hour) => {
          const intensity = mins / 60;
          const label = `${String(hour).padStart(2, '0')}:00`;
          
          return (
            <div
              key={hour}
              title={`${label}: ${mins} mins logged`}
              className="aspect-square rounded-xl flex flex-col items-center justify-between p-1 border border-border/50 transition-all duration-200 hover:scale-105 hover:border-primary/30 relative cursor-help"
              style={{
                backgroundColor: mins > 0 
                  ? `color-mix(in srgb, var(--primary) ${Math.max(10, Math.round(intensity * 100)) - 10}%, var(--surface))`
                  : 'var(--surface)',
                borderColor: mins > 0 ? 'color-mix(in srgb, var(--primary) 30%, transparent)' : undefined,
              }}
            >
              <span className={`text-[7px] font-bold ${mins > 0 ? 'text-primary' : 'text-muted'}`}>
                {String(hour).padStart(2, '0')}
              </span>
              <span className={`text-[10px] font-extrabold ${mins > 0 ? 'text-foreground' : 'text-muted/40'}`}>
                {mins || '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[8px] font-bold text-muted uppercase tracking-wider pt-1 border-t border-border/40">
        <span>00h</span>
        <span>23h</span>
      </div>
    </div>
  );
}
