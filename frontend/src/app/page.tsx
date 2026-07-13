'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, IActivity, getLocalDateString } from '@/context/AppContext';
import { useToast } from '@/components/ToastProvider';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { TimePicker } from '@/components/TimePicker';
import {
  Plus, Trash2, Pencil, Check, X,
  AlertTriangle, AlertCircle, Lock, TrendingUp,
  Clock, Zap, Layers, ChevronRight, ArrowUpRight,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Work',        emoji: '💼', badge: 'badge-work' },
  { name: 'Learning',    emoji: '📚', badge: 'badge-learning' },
  { name: 'Health',      emoji: '🏃', badge: 'badge-health' },
  { name: 'Personal',    emoji: '🏠', badge: 'badge-personal' },
  { name: 'Distraction', emoji: '📱', badge: 'badge-distraction' },
  { name: 'Sleep',       emoji: '😴', badge: 'badge-sleep' },
] as const;

type CategoryName = typeof CATEGORIES[number]['name'];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.name, c])) as Record<
  CategoryName,
  typeof CATEGORIES[number]
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeToMins = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const fmtMins = (total: number): string => {
  if (total <= 0) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
};

const todayNowMins = (): number => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<any>;
  colorClass?: string;
}) {
  return (
    <div className="card card-hover p-4 sm:p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${colorClass || 'bg-surface-hover text-muted'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-muted truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: CategoryName }) {
  const cat = CAT_MAP[category];
  return (
    <span className={`badge ${cat.badge}`}>
      {cat.emoji} {category}
    </span>
  );
}

function TimelineItem({ act, isLast }: { act: IActivity; isLast: boolean }) {
  const dur = act.duration ? fmtMins(act.duration) : '...';
  const cat = CAT_MAP[act.category as CategoryName];
  return (
    <div className="relative pl-5">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
      )}
      {/* Dot */}
      <div
        className="absolute left-0 top-[7px] w-3.5 h-3.5 rounded-full border-2 border-background"
        style={{ backgroundColor: `var(--${act.category.toLowerCase()})` }}
      />
      <div className="pb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-xs font-bold text-muted">
            {act.startTime}{act.endTime ? ` → ${act.endTime}` : ''}
          </span>
          <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded font-medium">
            {dur}
          </span>
        </div>
        <p className="text-sm font-semibold leading-snug">{act.activity}</p>
        {act.notes && <p className="text-xs text-muted mt-0.5 truncate max-w-[220px]">{act.notes}</p>}
      </div>
    </div>
  );
}

// ─── Inline form component ────────────────────────────────────────────────────

interface ActivityFormValues {
  startTime: string;
  endTime: string;
  activity: string;
  category: CategoryName;
  notes: string;
}

const EMPTY_FORM: ActivityFormValues = {
  startTime: '',
  endTime: '',
  activity: '',
  category: 'Work',
  notes: '',
};

function ActivityFormRow({
  initial,
  onSave,
  onCancel,
  isNew,
}: {
  initial?: ActivityFormValues;
  onSave: (v: ActivityFormValues) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}) {
  const { toast } = useToast();
  const [v, setV] = useState<ActivityFormValues>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const actRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    actRef.current?.focus();
  }, []);

  const set = <K extends keyof ActivityFormValues>(k: K, val: ActivityFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const handleSave = async () => {
    if (!v.startTime) { toast.error('Start time is required'); return; }
    if (!v.activity.trim()) { toast.error('Activity name is required'); return; }
    if (v.endTime && v.startTime >= v.endTime) {
      toast.error('End time must be after start time'); return;
    }
    setSaving(true);
    try {
      await onSave({ ...v, activity: v.activity.trim() });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'field text-xs';

  return (
    <tr className="bg-primary/5 border-b border-border">
      <td className="p-2 w-28">
        <TimePicker value={v.startTime} onChange={(val) => set('startTime', val)} />
      </td>
      <td className="p-2 w-28">
        <TimePicker value={v.endTime} onChange={(val) => set('endTime', val)} />
      </td>
      <td className="p-2">
        <input
          ref={actRef}
          type="text"
          value={v.activity}
          onChange={(e) => set('activity', e.target.value)}
          placeholder="What did you do?"
          className={inputCls}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
        />
      </td>
      <td className="p-2 w-36">
        <select
          value={v.category}
          onChange={(e) => set('category', e.target.value as CategoryName)}
          className={inputCls}
        >
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </td>
      <td className="p-2 hidden md:table-cell">
        <input
          type="text"
          value={v.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Notes (optional)"
          className={inputCls}
        />
      </td>
      <td className="p-2 w-20">
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-icon text-emerald-500 hover:bg-emerald-500/10"
            title="Save (Enter)"
          >
            {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />}
          </button>
          <button onClick={onCancel} className="btn-icon" title="Cancel (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    user, isAuthenticated, isLoading, activitiesLoading,
    currentDate, activities, isLocked, unclosedDays,
    addActivity, updateActivity, deleteActivity,
  } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [showAddRow, setShowAddRow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Unclosed day resolution
  const [resolvingIdx, setResolvingIdx] = useState(0);
  const [resolveTime, setResolveTime] = useState('');
  const [resolving, setResolving] = useState(false);

  // Inactivity check
  const [inactiveWarning, setInactiveWarning] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  // Inactivity check (runs once per minute)
  useEffect(() => {
    const check = () => {
      if (!activities.length || currentDate !== getLocalDateString()) {
        setInactiveWarning(false);
        return;
      }
      const last = activities[activities.length - 1];
      if (!last.endTime) { setInactiveWarning(false); return; }
      const gap = todayNowMins() - timeToMins(last.endTime);
      setInactiveWarning(gap >= 120);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [activities, currentDate]);

  // ── Default start time for new entry ──────────────────────────────────────
  const defaultStartTime = useCallback((): string => {
    if (activities.length > 0) {
      const last = activities[activities.length - 1];
      if (last.endTime) return last.endTime;
    }
    // Default to current time HH:MM
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  }, [activities]);

  // ── Metrics derived from activities ───────────────────────────────────────
  const metrics = React.useMemo(() => {
    let total = 0, productive = 0;
    const catBreak: Record<string, number> = {};

    for (const act of activities) {
      if (act.duration) {
        total += act.duration;
        catBreak[act.category] = (catBreak[act.category] || 0) + act.duration;
        if (['Work', 'Learning', 'Health'].includes(act.category)) productive += act.duration;
      }
    }

    const score = total > 0 ? Math.round((productive / total) * 100) : 0;
    let topCat = '';
    let topTime = -1;
    for (const [c, t] of Object.entries(catBreak)) {
      if (t > topTime) { topTime = t; topCat = c; }
    }

    return { total, productive, score, topCat, topTime };
  }, [activities]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAdd = useCallback(async (v: ActivityFormValues) => {
    await addActivity({
      date: currentDate,
      startTime: v.startTime,
      endTime: v.endTime || undefined,
      activity: v.activity,
      category: v.category,
      notes: v.notes || undefined,
    });
    setShowAddRow(false);
    toast.success('Activity logged!');
  }, [addActivity, currentDate, toast]);

  const handleEdit = useCallback((act: IActivity) => {
    setEditingId(act._id);
    setShowAddRow(false);
  }, []);

  const handleUpdate = useCallback(async (id: string, v: ActivityFormValues) => {
    await updateActivity(id, {
      startTime: v.startTime,
      endTime: v.endTime || undefined,
      activity: v.activity,
      category: v.category,
      notes: v.notes || undefined,
    });
    setEditingId(null);
    toast.success('Activity updated!');
  }, [updateActivity, toast]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteActivity(id);
      toast.success('Activity deleted');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }, [deleteActivity, toast]);

  // ── Resolve unclosed day ──────────────────────────────────────────────────
  const handleResolveDay = async () => {
    if (!resolveTime) { toast.error('Please enter an end time'); return; }
    setResolving(true);
    try {
      const target = unclosedDays[resolvingIdx];
      await updateActivity(target.activityId, { endTime: resolveTime });
      setResolveTime('');
      setResolvingIdx(0);
      toast.success('Activity resolved — daily report will generate automatically.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResolving(false);
    }
  };

  // ── Gaps computation ──────────────────────────────────────────────────────
  const gaps: Array<{ after: string; mins: number }> = React.useMemo(() => {
    const out: Array<{ after: string; mins: number }> = [];
    for (let i = 0; i < activities.length - 1; i++) {
      const cur = activities[i];
      const nxt = activities[i + 1];
      if (!cur.endTime) continue;
      let gap = timeToMins(nxt.startTime) - timeToMins(cur.endTime);
      if (gap < 0) gap += 1440;
      if (gap > 0) out.push({ after: cur._id, mins: gap });
    }
    return out;
  }, [activities]);

  const gapMap = Object.fromEntries(gaps.map((g) => [g.after, g.mins]));

  // ── Loading / guard states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="spinner w-8 h-8 border-[3px]" />
          <p className="text-sm text-muted">Loading TimeLog...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isToday = currentDate === getLocalDateString();

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16 md:pb-0">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ── Unclosed Day Warning ───────────────────────────────────────── */}
        {unclosedDays.length > 0 && (
          <div className="card border-amber-500/40 bg-amber-500/5 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center animate-fade-up">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-400">Unresolved Past Activity</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  <span className="font-semibold text-foreground">{unclosedDays[resolvingIdx].date}</span> —
                  &ldquo;{unclosedDays[resolvingIdx].activityName}&rdquo; started at{' '}
                  <span className="font-mono font-bold">{unclosedDays[resolvingIdx].startTime}</span>{' '}
                  has no end time. Set it to generate the daily report.
                </p>
                {unclosedDays.length > 1 && (
                  <p className="text-[10px] text-muted mt-1">
                    {unclosedDays.length - 1} more day{unclosedDays.length > 2 ? 's' : ''} pending resolution.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TimePicker
                value={resolveTime}
                onChange={(val) => setResolveTime(val)}
                className="w-32 text-xs"
              />
              <button
                onClick={handleResolveDay}
                disabled={resolving}
                className="btn btn-primary text-xs py-2 px-3"
              >
                {resolving ? <span className="spinner border-white/30 border-t-white" /> : 'Resolve'}
              </button>
            </div>
          </div>
        )}

        {/* ── Inactivity Warning ─────────────────────────────────────────── */}
        {inactiveWarning && isToday && (
          <div className="card border-rose-500/40 bg-rose-500/5 p-3 flex items-center gap-3 animate-fade-up">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="text-xs text-muted flex-1">
              <span className="font-bold text-rose-400">2+ hours since last log.</span>{' '}
              Don&apos;t forget to record your current activity.
            </p>
            <button
              onClick={() => { setShowAddRow(true); setInactiveWarning(false); }}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline shrink-0"
            >
              Log now <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── Locked day notice ──────────────────────────────────────────── */}
        {isLocked && (
          <div className="card border-indigo-500/30 bg-indigo-500/5 p-3 flex items-center gap-3">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
            <p className="text-xs text-muted">
              This day is <span className="font-bold text-indigo-400">locked</span> — a productivity report has been generated.
              Navigate to <span className="font-semibold text-foreground">History</span> to view it.
            </p>
          </div>
        )}

        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <StatCard
            label="Logged Time"
            value={fmtMins(metrics.total)}
            sub={`${activities.length} activit${activities.length === 1 ? 'y' : 'ies'}`}
            icon={Clock}
            colorClass="bg-primary/10 text-primary border border-primary/10"
          />
          <StatCard
            label="Productive Time"
            value={fmtMins(metrics.productive)}
            sub="Work + Learning + Health"
            icon={Zap}
            colorClass="bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
          />
          <StatCard
            label="Productivity Score"
            value={`${metrics.score}%`}
            sub={metrics.score >= 70 ? '🟢 High' : metrics.score >= 40 ? '🟡 Average' : metrics.total === 0 ? '—' : '🔴 Low'}
            icon={TrendingUp}
            colorClass={
              metrics.score >= 70
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                : metrics.score >= 40
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/10'
            }
          />
          <StatCard
            label="Top Category"
            value={metrics.topCat ? `${CAT_MAP[metrics.topCat as CategoryName]?.emoji ?? ''} ${metrics.topCat}` : '—'}
            sub={metrics.topTime > 0 ? fmtMins(metrics.topTime) : 'No category yet'}
            icon={Layers}
            colorClass="bg-indigo-500/10 text-indigo-500 border border-indigo-500/10"
          />
        </div>

        {/* ── Productivity bar ───────────────────────────────────────────── */}
        {metrics.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-muted">
              <span>Daily Breakdown</span>
              <span>{fmtMins(metrics.total)} logged</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-hover">
              {CATEGORIES.map((cat) => {
                const catMin = activities
                  .filter((a) => a.category === cat.name && a.duration)
                  .reduce((s, a) => s + (a.duration ?? 0), 0);
                const pct = metrics.total > 0 ? (catMin / metrics.total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={cat.name}
                    title={`${cat.name}: ${fmtMins(catMin)}`}
                    className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: `var(--${cat.name.toLowerCase()})` }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {CATEGORIES.map((cat) => {
                const catMin = activities
                  .filter((a) => a.category === cat.name && a.duration)
                  .reduce((s, a) => s + (a.duration ?? 0), 0);
                if (!catMin) return null;
                return (
                  <span key={cat.name} className="flex items-center gap-1 text-[10px] text-muted font-semibold">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: `var(--${cat.name.toLowerCase()})` }}
                    />
                    {cat.emoji} {fmtMins(catMin)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main 2-column layout ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

          {/* Activity log table */}
          <div className="xl:col-span-2 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-bold">
                  Activity Log
                  {activitiesLoading && <span className="spinner ml-2 w-3 h-3 border-[2px]" />}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {isToday ? "Today" : currentDate} · {isLocked ? '🔒 Locked day' : `${activities.length} entr${activities.length === 1 ? 'y' : 'ies'}`}
                </p>
              </div>
              {!isLocked && !showAddRow && editingId === null && (
                <button
                  onClick={() => setShowAddRow(true)}
                  className="btn btn-primary text-xs py-2 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Activity
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-28">Start</th>
                    <th className="w-28">End</th>
                    <th>Activity</th>
                    <th className="w-36">Category</th>
                    <th className="hidden md:table-cell">Notes</th>
                    <th className="w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* New activity form row */}
                  {showAddRow && !isLocked && (
                    <ActivityFormRow
                      initial={{ ...EMPTY_FORM, startTime: defaultStartTime() }}
                      onSave={handleAdd}
                      onCancel={() => setShowAddRow(false)}
                      isNew
                    />
                  )}

                  {/* Existing activities */}
                  {activities.map((act) => {
                    const gap = gapMap[act._id];
                    const isEditing = editingId === act._id;
                    const isDeleting = deletingId === act._id;

                    return (
                      <React.Fragment key={act._id}>
                        {isEditing ? (
                          <ActivityFormRow
                            initial={{
                              startTime: act.startTime,
                              endTime: act.endTime ?? '',
                              activity: act.activity,
                              category: act.category as CategoryName,
                              notes: act.notes ?? '',
                            }}
                            onSave={(v) => handleUpdate(act._id, v)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <tr className={isDeleting ? 'opacity-40' : ''}>
                            <td className="font-mono text-xs font-bold">{act.startTime}</td>
                            <td className="font-mono text-xs text-muted">
                              {act.endTime || <span className="text-primary animate-pulse font-semibold">Active</span>}
                            </td>
                            <td>
                              <div>
                                <p className="font-semibold text-sm">{act.activity}</p>
                                {act.duration !== undefined && (
                                  <p className="text-[10px] text-muted">{fmtMins(act.duration)}</p>
                                )}
                              </div>
                            </td>
                            <td><CategoryBadge category={act.category as CategoryName} /></td>
                            <td className="hidden md:table-cell text-xs text-muted truncate max-w-[160px]">
                              {act.notes || <span className="opacity-30">—</span>}
                            </td>
                            <td>
                              {!isLocked && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleEdit(act)}
                                    className="btn-icon"
                                    title="Edit activity"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(act._id)}
                                    disabled={isDeleting}
                                    className="btn-icon danger"
                                    title="Delete activity"
                                  >
                                    {isDeleting ? <span className="spinner w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}

                        {/* Gap row */}
                        {gap !== undefined && gap > 0 && (
                          <tr className="unlogged-gap-row">
                            <td colSpan={6} className="py-2 px-5">
                              <span className="text-[11px] font-bold text-rose-500 italic flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {fmtMins(gap)} unlogged gap
                              </span>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Empty state */}
                  {activities.length === 0 && !showAddRow && !activitiesLoading && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 px-4">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
                            <Layers className="w-6 h-6 text-muted" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">No activities logged</p>
                            <p className="text-xs text-muted mt-1">
                              {isLocked
                                ? 'This day has no recorded activities.'
                                : 'Click "Add Activity" to start tracking your day.'}
                            </p>
                          </div>
                          {!isLocked && (
                            <button onClick={() => setShowAddRow(true)} className="btn btn-primary text-xs">
                              <Plus className="w-3.5 h-3.5" /> Log First Activity
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Skeleton loader */}
                  {activitiesLoading && activities.length === 0 && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <tr key={i}>
                          <td colSpan={6} className="p-3">
                            <div className="skeleton h-5 w-full rounded" />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline sidebar */}
          <div className="card p-5">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Daily Timeline
            </h2>

            {activities.length > 0 ? (
              <div>
                {activities.map((act, i) => (
                  <TimelineItem
                    key={act._id}
                    act={act}
                    isLast={i === activities.length - 1}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted italic">
                Your day&apos;s flow will appear here as you log activities.
              </p>
            )}

            {/* Score summary at bottom of timeline */}
            {metrics.total > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Productivity
                  </span>
                  <span className={`font-extrabold ${
                    metrics.score >= 70 ? 'text-health' :
                    metrics.score >= 40 ? 'text-personal' : 'text-distraction'
                  }`}>
                    {metrics.score}%
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${metrics.score}%`,
                      backgroundColor: metrics.score >= 70 ? 'var(--health)' :
                        metrics.score >= 40 ? 'var(--personal)' : 'var(--distraction)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

