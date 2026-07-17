'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp, getLocalDateString } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { api } from '@/services/api';
import { useToast } from '@/components/ToastProvider';
import {
  ChevronLeft, ChevronRight, Flame, Clock,
  Activity, HelpCircle, Calendar, BarChart3, Lock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarDay {
  date: string;
  score: number;
  color: 'green' | 'yellow' | 'red' | 'gray';
}

interface DailyReport {
  totalLoggedTime: number;
  productiveTime: number;
  productivityScore: number;
  workTime: number;
  learningTime: number;
  personalTime: number;
  healthTime: number;
  distractionTime: number;
  sleepTime: number;
  longestFocusSession: { activity: string; duration: number };
  averageSession: number;
  activitySwitches: number;
  unloggedTime: number;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMins(m: number): string {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  return h ? `${h}h` : `${min}m`;
}

function fmtDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const COLOR_CLASSES: Record<CalendarDay['color'], { bg: string; text: string; ring: string }> = {
  green:  { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500' },
  yellow: { bg: 'bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/20 dark:hover:bg-amber-500/25',     text: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-500' },
  red:    { bg: 'bg-rose-500/10 dark:bg-rose-500/15 hover:bg-rose-500/20 dark:hover:bg-rose-500/25',       text: 'text-rose-600 dark:text-rose-400',    ring: 'ring-rose-500' },
  gray:   { bg: 'bg-surface-hover hover:bg-surface-hover',   text: 'text-muted',       ring: 'ring-border' },
};

const SCORE_COLOR = (s: number) => s >= 70 ? 'text-emerald-600 dark:text-emerald-400' : s >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading, setCurrentDate } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  // Load calendar for current year/month
  const fetchCalendar = useCallback(async () => {
    if (!user) return;
    setCalLoading(true);
    try {
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      const res = await api.get<{ success: boolean; calendar: CalendarDay[] }>(`/reports/calendar?yearMonth=${ym}`);
      setCalendarData(res.calendar);
    } catch (err: any) {
      toast.error('Could not load calendar data');
    } finally {
      setCalLoading(false);
    }
  }, [year, month, user, toast]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // Load daily report when selectedDate changes
  const fetchReport = useCallback(async (date: string) => {
    if (!user) return;
    setReportLoading(true);
    setReport(null);
    try {
      const res = await api.get<{ success: boolean; report: DailyReport | null }>(`/reports/daily?date=${date}`);
      setReport(res.report);
    } catch (err: any) {
      toast.error('Could not load daily report');
    } finally {
      setReportLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchReport(selectedDate); }, [fetchReport, selectedDate]);

  // ── Month navigation ──────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const calMap: Record<string, CalendarDay> = Object.fromEntries(calendarData.map(d => [d.date, d]));

  const todayStr = getLocalDateString();
  const maxDate = todayStr;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="spinner w-8 h-8 border-[3px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0 bg-background">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Calendar Panel ────────────────────────────────────────────── */}
          <div className="lg:col-span-5 card p-5">
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {MONTHS[month - 1]} {year}
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="btn-icon">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="btn-icon">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-semibold text-muted mb-4">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />High ≥70%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Avg 40–69%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />Low &lt;40%</span>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-muted py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className={`grid grid-cols-7 gap-1 relative ${calLoading ? 'opacity-50' : ''}`}>
              {/* Padding for first day */}
              {Array.from({ length: firstDay }, (_, i) => <div key={`pad-${i}`} />)}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
                const isFuture = dateStr > maxDate;
                const isSelected = dateStr === selectedDate;
                const dayData = calMap[dateStr];
                const color = dayData?.color ?? 'gray';
                const cls = COLOR_CLASSES[color];

                return (
                  <button
                    key={dateStr}
                    onClick={() => { if (!isFuture) setSelectedDate(dateStr); }}
                    disabled={isFuture}
                    title={dayData ? `${dayData.score}% productivity` : undefined}
                    className={`
                      aspect-square rounded-xl flex items-center justify-center
                      text-xs font-bold transition-all
                      ${isFuture ? 'opacity-20 cursor-not-allowed' : cls.bg + ' cursor-pointer'}
                      ${isSelected ? `ring-2 ${cls.ring} ring-offset-2 ring-offset-background scale-110 shadow-lg` : ''}
                      ${dateStr === todayStr && !isSelected ? 'ring-1 ring-primary/40' : ''}
                    `}
                  >
                    <span className={isSelected ? 'font-extrabold' : (dayData ? cls.text : 'text-foreground')}>
                      {dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Report Panel ──────────────────────────────────────────────── */}
          <div className="lg:col-span-7 card overflow-hidden">
            {/* Report header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div>
                <h2 className="text-base font-bold">{fmtDate(selectedDate)}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted">Daily productivity report</p>
                  {report && (
                    <button
                      onClick={() => {
                        setCurrentDate(selectedDate);
                        router.push('/');
                      }}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10 ml-2"
                    >
                      <Clock className="w-3 h-3" />
                      View Log Details
                    </button>
                  )}
                </div>
              </div>
              {report && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-3xl font-extrabold ${SCORE_COLOR(report.productivityScore)}`}>
                    {report.productivityScore}%
                  </span>
                  <span title="Day locked — report generated">
                    <Lock className="w-4 h-4 text-muted" />
                  </span>
                </div>
              )}
            </div>

            {/* Report body */}
            <div className="p-6">
              {reportLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="skeleton h-10 rounded-xl" />
                  ))}
                </div>
              ) : report ? (
                <div className="space-y-6">
                  {/* Time breakdown grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Logged',   value: report.totalLoggedTime,   accent: 'text-foreground' },
                      { label: '💼 Work',         value: report.workTime,          accent: 'text-[var(--work)]' },
                      { label: '📚 Learning',     value: report.learningTime,      accent: 'text-[var(--learning)]' },
                      { label: '🏃 Health',       value: report.healthTime,        accent: 'text-[var(--health)]' },
                      { label: '🏠 Personal',     value: report.personalTime,      accent: 'text-[var(--personal)]' },
                      { label: '📱 Distraction',  value: report.distractionTime,   accent: 'text-[var(--distraction)] font-bold' },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="card card-hover p-4 space-y-1 hover:border-primary/20 transition-all duration-200">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</p>
                        <p className={`text-xl font-extrabold ${accent}`}>{fmtMins(value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Productivity bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted font-semibold">
                      <span>Productive vs Total</span>
                      <span>{fmtMins(report.productiveTime)} / {fmtMins(report.totalLoggedTime)}</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${report.productivityScore}%`,
                          backgroundColor: report.productivityScore >= 70 ? 'var(--health)' : report.productivityScore >= 40 ? 'var(--personal)' : 'var(--distraction)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Time distribution bar */}
                  <div className="space-y-2 bg-surface-hover/20 p-3 rounded-xl border border-border/30">
                    <div className="flex justify-between text-xs text-muted font-semibold">
                      <span className="uppercase tracking-wider text-[9px] font-bold">Time Distribution</span>
                      <span className="font-bold text-foreground text-[10px]">{fmtMins(report.totalLoggedTime)} logged</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-hover">
                      {[
                        { name: 'Work', time: report.workTime, color: 'var(--work)' },
                        { name: 'Learning', time: report.learningTime, color: 'var(--learning)' },
                        { name: 'Health', time: report.healthTime, color: 'var(--health)' },
                        { name: 'Personal', time: report.personalTime, color: 'var(--personal)' },
                        { name: 'Distraction', time: report.distractionTime, color: 'var(--distraction)' },
                        { name: 'Sleep', time: report.sleepTime, color: 'var(--sleep)' },
                      ].map(({ name, time, color }) => {
                        const pct = report.totalLoggedTime > 0 ? (time / report.totalLoggedTime) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                          <div
                            key={name}
                            title={`${name}: ${fmtMins(time)}`}
                            className="h-full"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 pt-0.5">
                      {[
                        { name: 'Work', time: report.workTime, color: 'var(--work)', emoji: '💼' },
                        { name: 'Learning', time: report.learningTime, color: 'var(--learning)', emoji: '📚' },
                        { name: 'Health', time: report.healthTime, color: 'var(--health)', emoji: '🏃' },
                        { name: 'Personal', time: report.personalTime, color: 'var(--personal)', emoji: '🏠' },
                        { name: 'Distraction', time: report.distractionTime, color: 'var(--distraction)', emoji: '📱' },
                        { name: 'Sleep', time: report.sleepTime, color: 'var(--sleep)', emoji: '😴' },
                      ].map(({ name, time, color, emoji }) => {
                        if (!time) return null;
                        return (
                          <span key={name} className="flex items-center gap-1 text-[9px] text-muted font-bold">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            {emoji} {fmtMins(time)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Insights */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Daily Insights</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          icon: <Flame className="w-4 h-4" />,
                          label: 'Longest Focus Session',
                          value: report.longestFocusSession.activity || 'None',
                          sub: fmtMins(report.longestFocusSession.duration),
                          color: 'text-emerald-400 bg-emerald-500/10',
                        },
                        {
                          icon: <Clock className="w-4 h-4" />,
                          label: 'Average Session Length',
                          value: report.averageSession ? `${report.averageSession} min` : '—',
                          sub: undefined,
                          color: 'text-primary bg-primary/10',
                        },
                        {
                          icon: <Activity className="w-4 h-4" />,
                          label: 'Activity Switches',
                          value: `${report.activitySwitches} entries`,
                          sub: undefined,
                          color: 'text-amber-400 bg-amber-500/10',
                        },
                        {
                          icon: <HelpCircle className="w-4 h-4" />,
                          label: 'Unlogged Gap Time',
                          value: fmtMins(report.unloggedTime),
                          sub: 'gaps between activities',
                          color: 'text-muted bg-surface-hover',
                        },
                      ].map(({ icon, label, value, sub, color }) => (
                        <div key={label} className="flex items-start gap-3 border border-border rounded-xl p-3">
                          <div className={`p-2 rounded-lg shrink-0 ${color}`}>{icon}</div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-muted">{label}</p>
                            <p className="text-sm font-bold truncate">{value}</p>
                            {sub && <p className="text-[10px] text-muted">{sub}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">No report for this day</p>
                    <p className="text-xs text-muted mt-1 max-w-[280px]">
                      Reports are generated automatically when a day ends with all activities fully logged.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
