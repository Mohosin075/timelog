'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp, getLocalDateString } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { api } from '@/services/api';
import { useToast } from '@/components/ToastProvider';
import { WeeklyTrendChart } from '@/components/WeeklyTrendChart';
import { AICoachWidget } from '@/components/AICoachWidget';
import { BarChart3, TrendingUp, ChevronLeft, ChevronRight, RefreshCw, Clock, Flame } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmtMins(m: number): string {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  return h ? `${h}h` : `${min}m`;
}

interface WeeklySummary {
  avgProductivity: number;
  mostProductiveDay: string;
  avgWorkTime: number;
  avgLearningTime: number;
  avgDistractionTime: number;
  dailyScores: { date: string; score: number }[];
}

interface MonthlySummary {
  avgProductivity: number;
  totalWorkHours: number;
  totalLearningHours: number;
  totalDistractionHours: number;
  mostActiveCategory: string;
  mostProductiveDay: string;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--health)' : score >= 40 ? 'var(--personal)' : 'var(--distraction)';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted font-semibold">
        <span>Avg Productivity</span>
        <span className="font-extrabold text-foreground">{score}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function SummaryPage() {
  const { user, isAuthenticated, isLoading } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  const fetchWeekly = useCallback(async () => {
    if (!user) return;
    setWeeklyLoading(true);
    try {
      const today = getLocalDateString();
      const res = await api.get<{ success: boolean; summary: WeeklySummary }>(`/reports/weekly?endDate=${today}`);
      setWeekly(res.summary);
    } catch (err: any) {
      toast.error('Could not load weekly summary');
    } finally {
      setWeeklyLoading(false);
    }
  }, [user, toast]);

  const fetchMonthly = useCallback(async () => {
    if (!user) return;
    setMonthlyLoading(true);
    try {
      const ym = `${selectedYear}-${String(selectedMonth).padStart(2,'0')}`;
      const res = await api.get<{ success: boolean; summary: MonthlySummary }>(`/reports/monthly?yearMonth=${ym}`);
      setMonthly(res.summary);
    } catch (err: any) {
      toast.error('Could not load monthly summary');
    } finally {
      setMonthlyLoading(false);
    }
  }, [user, selectedYear, selectedMonth, toast]);

  useEffect(() => { if (user) { fetchWeekly(); } }, [fetchWeekly]);
  useEffect(() => { if (user) { fetchMonthly(); } }, [fetchMonthly]);

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    const n = new Date();
    if (selectedYear >= n.getFullYear() && selectedMonth >= n.getMonth() + 1) return;
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Performance Summaries</h1>
          <p className="text-xs text-muted mt-1">Aggregated statistics across your logged history.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Weekly Panel ────────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Last 7 Days
              </h2>
              <button
                onClick={fetchWeekly}
                disabled={weeklyLoading}
                className="btn-icon"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${weeklyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {weeklyLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="skeleton h-8 rounded-xl" />)}
                </div>
              ) : weekly && weekly.mostProductiveDay !== 'N/A' ? (
                <>
                  <ScoreBar score={weekly.avgProductivity} />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="card card-hover p-4 hover:border-primary/20">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Best Day</p>
                      <p className="text-base font-extrabold mt-1">{weekly.mostProductiveDay}</p>
                    </div>
                    <div className="card card-hover p-4 hover:border-primary/20">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Avg Work</p>
                      <p className="text-base font-extrabold mt-1 text-[var(--work)]">{fmtMins(weekly.avgWorkTime)}<span className="text-[10px] text-muted font-normal">/day</span></p>
                    </div>
                  </div>

                  <WeeklyTrendChart data={weekly.dailyScores} />

                  {/* Visual Balance Bar */}
                  {(() => {
                    const totalWeeklyTime = weekly.avgWorkTime + weekly.avgLearningTime + weekly.avgDistractionTime;
                    if (totalWeeklyTime <= 0) return null;
                    const workPct = (weekly.avgWorkTime / totalWeeklyTime) * 100;
                    const learnPct = (weekly.avgLearningTime / totalWeeklyTime) * 100;
                    const distPct = (weekly.avgDistractionTime / totalWeeklyTime) * 100;

                    return (
                      <div className="space-y-1.5 bg-surface-hover/20 p-3 rounded-xl border border-border/30">
                        <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                          <span>Activity Balance</span>
                          <span>{fmtMins(totalWeeklyTime)} / day</span>
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-hover">
                          {workPct > 0 && <div className="h-full" style={{ width: `${workPct}%`, backgroundColor: 'var(--work)' }} title={`Work: ${workPct.toFixed(0)}%`} />}
                          {learnPct > 0 && <div className="h-full" style={{ width: `${learnPct}%`, backgroundColor: 'var(--learning)' }} title={`Learning: ${learnPct.toFixed(0)}%`} />}
                          {distPct > 0 && <div className="h-full" style={{ width: `${distPct}%`, backgroundColor: 'var(--distraction)' }} title={`Distraction: ${distPct.toFixed(0)}%`} />}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2.5 pt-1">
                    {[
                      { label: '📚 Avg Learning', value: weekly.avgLearningTime, color: 'var(--learning)' },
                      { label: '📱 Avg Distraction', value: weekly.avgDistractionTime, color: 'var(--distraction)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{label}</span>
                        <span className="font-bold" style={{ color }}>{fmtMins(value)}/day</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted italic text-center py-8">No weekly data yet — start logging activities.</p>
              )}
            </div>
          </div>

          {/* ── Monthly Panel ───────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} className="btn-icon">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold min-w-[130px] text-center">
                    {MONTHS[selectedMonth - 1]} {selectedYear}
                  </span>
                  <button onClick={nextMonth} className="btn-icon">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button onClick={fetchMonthly} disabled={monthlyLoading} className="btn-icon" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${monthlyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {monthlyLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="skeleton h-8 rounded-xl" />)}
                </div>
              ) : monthly && monthly.mostProductiveDay !== 'N/A' ? (
                <>
                  <ScoreBar score={monthly.avgProductivity} />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="card card-hover p-4 hover:border-primary/20">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Best Day (avg)</p>
                      <p className="text-base font-extrabold mt-1">{monthly.mostProductiveDay}</p>
                    </div>
                    <div className="card card-hover p-4 hover:border-primary/20">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Most Active</p>
                      <p className="text-base font-extrabold mt-1">{monthly.mostActiveCategory}</p>
                    </div>
                  </div>

                  {/* Visual Balance Bar */}
                  {(() => {
                    const totalMonthlyHours = monthly.totalWorkHours + monthly.totalLearningHours + monthly.totalDistractionHours;
                    if (totalMonthlyHours <= 0) return null;
                    const workPct = (monthly.totalWorkHours / totalMonthlyHours) * 100;
                    const learnPct = (monthly.totalLearningHours / totalMonthlyHours) * 100;
                    const distPct = (monthly.totalDistractionHours / totalMonthlyHours) * 100;

                    return (
                      <div className="space-y-1.5 bg-surface-hover/20 p-3 rounded-xl border border-border/30">
                        <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                          <span>Activity Balance</span>
                          <span>{totalMonthlyHours} hours total</span>
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-hover">
                          {workPct > 0 && <div className="h-full" style={{ width: `${workPct}%`, backgroundColor: 'var(--work)' }} title={`Work: ${workPct.toFixed(0)}%`} />}
                          {learnPct > 0 && <div className="h-full" style={{ width: `${learnPct}%`, backgroundColor: 'var(--learning)' }} title={`Learning: ${learnPct.toFixed(0)}%`} />}
                          {distPct > 0 && <div className="h-full" style={{ width: `${distPct}%`, backgroundColor: 'var(--distraction)' }} title={`Distraction: ${distPct.toFixed(0)}%`} />}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2.5 pt-1">
                    {[
                      { label: '💼 Total Work', value: `${monthly.totalWorkHours}h`, color: 'var(--work)' },
                      { label: '📚 Total Learning', value: `${monthly.totalLearningHours}h`, color: 'var(--learning)' },
                      { label: '📱 Total Distraction', value: `${monthly.totalDistractionHours}h`, color: 'var(--distraction)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{label}</span>
                        <span className="font-bold" style={{ color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted italic text-center py-8">No monthly data yet for this period.</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Coach Assistant Section */}
        {((weekly && weekly.mostProductiveDay !== 'N/A') || (monthly && monthly.mostProductiveDay !== 'N/A')) && (
          <AICoachWidget
            avgScore={weekly ? weekly.avgProductivity : (monthly ? monthly.avgProductivity : 0)}
            workMins={weekly ? weekly.avgWorkTime : (monthly ? monthly.totalWorkHours * 60 : 0)}
            learnMins={weekly ? weekly.avgLearningTime : (monthly ? monthly.totalLearningHours * 60 : 0)}
            distMins={weekly ? weekly.avgDistractionTime : (monthly ? monthly.totalDistractionHours * 60 : 0)}
          />
        )}
      </main>
    </div>
  );
}
