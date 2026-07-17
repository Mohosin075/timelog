'use client';

import React from 'react';

interface AICoachWidgetProps {
  avgScore: number;
  workMins: number;
  learnMins: number;
  distMins: number;
}

export function AICoachWidget({ avgScore, workMins, learnMins, distMins }: AICoachWidgetProps) {
  const coachInsights = React.useMemo(() => {
    const total = workMins + learnMins + distMins;
    const workPct = total > 0 ? (workMins / total) * 100 : 0;
    const distPct = total > 0 ? (distMins / total) * 100 : 0;

    let title = 'Steady Builder 🔨';
    let summary = 'Your daily schedule shows regular focus sessions, but there is room to decrease distraction peaks.';
    let actionItem1 = 'Plan deep work blocks in the morning to increase focus density.';
    let actionItem2 = 'Limit phone checks during designated learning hours.';

    if (avgScore >= 70) {
      title = 'Elite Operator ⚡';
      summary = 'Incredible productivity density! Your work-to-distraction ratio is extremely healthy.';
      actionItem1 = 'Schedule regular recovery blocks to prevent fatigue/burnout.';
      actionItem2 = 'Consider deepening focus sessions with structured Pomodoro rounds.';
    } else if (avgScore < 40) {
      title = 'Overwhelmed Log ⚠️';
      summary = 'Distraction peaks are outweighing deep focus blocks. Let us build structure step-by-step.';
      actionItem1 = 'Commit to just one 25-minute Pomodoro focus block daily.';
      actionItem2 = 'Turn off non-essential notifications during focus windows.';
    } else if (distPct > 35) {
      title = 'Distraction Heavy 📱';
      summary = 'Your balance shows significant fragmentation due to micro-distractions during logged time.';
      actionItem1 = 'Try logging unlogged gaps immediately to understand time leaks.';
      actionItem2 = 'Utilize full-screen mode on tools during deep work blocks.';
    }

    return { title, summary, actionItem1, actionItem2 };
  }, [avgScore, workMins, learnMins, distMins]);

  return (
    <div className="card p-5 space-y-4 border border-primary/10 bg-primary/[0.01] relative overflow-hidden transition-all duration-300 hover:border-primary/20">
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary">AI Productivity Coach</h3>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-extrabold text-foreground">{coachInsights.title}</h4>
        <p className="text-xs text-muted leading-relaxed">{coachInsights.summary}</p>
      </div>

      <div className="space-y-2.5 pt-1 border-t border-border/40">
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Action Plan:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <span className="text-primary mt-0.5 font-bold">✓</span>
            <span className="text-foreground/90">{coachInsights.actionItem1}</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-primary mt-0.5 font-bold">✓</span>
            <span className="text-foreground/90">{coachInsights.actionItem2}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
