'use client';

import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

interface PomodoroWidgetProps {
  onSessionComplete: (durationMins: number, label: string) => void;
}

export function PomodoroWidget({ onSessionComplete }: PomodoroWidgetProps) {
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [label, setLabel] = useState('');

  const durations = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  const activeDuration = durations[mode];

  useEffect(() => {
    setTimeLeft(durations[mode]);
    setIsRunning(false);
  }, [mode]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch {}

      if (mode === 'focus') {
        onSessionComplete(Math.round(activeDuration / 60), label);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, activeDuration, label, onSessionComplete]);

  const progress = ((activeDuration - timeLeft) / activeDuration) * 100;
  
  const radius = 52;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="card p-5 space-y-4 relative overflow-hidden transition-all duration-300 hover:border-primary/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            Focus Session
          </h3>
          <p className="text-[10px] text-muted mt-0.5">Stay productive with the Pomodoro technique.</p>
        </div>
      </div>

      <div className="flex bg-surface-hover/50 p-1 rounded-xl gap-1 border border-border/40">
        {[
          { id: 'focus', text: 'Focus' },
          { id: 'shortBreak', text: 'Break' },
          { id: 'longBreak', text: 'Long Break' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as any)}
            className={`flex-1 text-[10px] font-extrabold py-1.5 px-2 rounded-lg transition-all active:scale-95 cursor-pointer ${
              mode === m.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {m.text}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center py-2 relative">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="stroke-surface-hover"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="stroke-primary transition-all duration-300"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold font-mono tracking-tight text-foreground">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[8px] font-extrabold text-muted uppercase mt-0.5 tracking-wider">
            {mode === 'focus' ? 'Focus' : 'Break'}
          </span>
        </div>
      </div>

      {mode === 'focus' && (
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-muted uppercase tracking-wider px-0.5">What are you working on?</p>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Coding dashboard, Reading..."
            className="field text-xs py-2"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 btn text-xs font-bold py-2 rounded-xl cursor-pointer ${
            isRunning ? 'btn-ghost border border-border text-foreground' : 'btn-primary'
          }`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => {
            setIsRunning(false);
            setTimeLeft(durations[mode]);
          }}
          className="btn-ghost border border-border text-xs px-3 py-2 rounded-xl text-muted hover:text-foreground cursor-pointer"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
