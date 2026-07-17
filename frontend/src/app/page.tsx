'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, IActivity, getLocalDateString } from '@/context/AppContext';
import { useToast } from '@/components/ToastProvider';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { TimePicker } from '@/components/TimePicker';
import { PomodoroWidget } from '@/components/PomodoroWidget';
import { PeakHoursWidget } from '@/components/PeakHoursWidget';
import {
  Plus, Trash2, Pencil, Check, X,
  AlertTriangle, AlertCircle, Lock, TrendingUp,
  Clock, Zap, Layers, ChevronRight, ArrowUpRight, Flame,
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

// Mobile metric widget — looks like a real app widget
function AppMetricWidget({
  label, value, sub, icon: Icon, accent, bgClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<any>;
  accent: string; // css color string
  bgClass: string;
}) {
  return (
    <div className={`flex-shrink-0 w-36 rounded-3xl p-4 ${bgClass} relative overflow-hidden`}>
      {/* Background decoration */}
      <div
        className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20"
        style={{ backgroundColor: accent }}
      />
      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center mb-3`}
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 leading-none mb-1">{label}</p>
      <p className="text-xl font-black leading-none" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[9px] text-muted mt-1 leading-tight">{sub}</p>}
    </div>
  );
}

// Mobile activity card — native iOS-style
function MobileActivityCard({
  act, onEdit, onDelete, isDeleting, isLocked,
}: {
  act: IActivity;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isLocked: boolean;
}) {
  const cat = CAT_MAP[act.category as CategoryName];
  const catVar = `var(--${act.category.toLowerCase()})`;
  const dur = act.duration ? fmtMins(act.duration) : null;
  const isActive = !act.endTime;

  return (
    <div
      className={`mx-3 mb-3 rounded-3xl bg-surface shadow-sm overflow-hidden transition-all duration-200 ${
        isDeleting ? 'opacity-40 scale-95' : ''
      }`}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Colored top stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: catVar }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Category icon circle */}
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-sm"
              style={{ backgroundColor: `color-mix(in srgb, ${catVar} 15%, transparent)` }}
            >
              {cat.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug truncate">{act.activity}</p>
              {act.notes && (
                <p className="text-[11px] text-muted mt-0.5 truncate">{act.notes}</p>
              )}
            </div>
          </div>
          {/* Actions */}
          {!isLocked && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onEdit}
                className="w-8 h-8 rounded-2xl bg-surface-hover flex items-center justify-center active:scale-90 transition-all"
              >
                <Pencil className="w-3.5 h-3.5 text-muted" />
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="w-8 h-8 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center active:scale-90 transition-all"
              >
                {isDeleting
                  ? <span className="spinner w-3.5 h-3.5" />
                  : <Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              </button>
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          {/* Time range */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catVar }} />
            <span className="font-mono text-[11px] font-bold text-foreground">{act.startTime}</span>
            {act.endTime ? (
              <>
                <span className="text-[10px] text-muted">→</span>
                <span className="font-mono text-[11px] font-semibold text-muted">{act.endTime}</span>
              </>
            ) : (
              <span className="text-[10px] font-bold text-primary animate-pulse">● Live</span>
            )}
          </div>
          {/* Chips row */}
          <div className="flex items-center gap-1.5">
            {dur && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${catVar} 12%, transparent)`,
                  color: catVar,
                }}
              >
                {dur}
              </span>
            )}
            <span
              className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color: catVar,
                borderColor: `color-mix(in srgb, ${catVar} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${catVar} 8%, transparent)`,
              }}
            >
              {act.category}
            </span>
          </div>
        </div>
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
          className={`${inputCls} font-bold`}
          style={{
            color: `var(--${v.category.toLowerCase()})`,
            backgroundColor: `color-mix(in srgb, var(--${v.category.toLowerCase()}) 8%, transparent)`,
            borderColor: `color-mix(in srgb, var(--${v.category.toLowerCase()}) 25%, transparent)`,
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name} style={{ color: 'var(--foreground)', backgroundColor: 'var(--surface)' }}>
              {c.emoji} {c.name}
            </option>
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

// ─── Mobile inline add/edit form ────────────────────────────────────────────

function MobileAddForm({
  initial, onSave, onCancel,
}: {
  initial?: ActivityFormValues;
  onSave: (v: ActivityFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [v, setV] = useState<ActivityFormValues>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const actRef = useRef<HTMLInputElement>(null);

  useEffect(() => { actRef.current?.focus(); }, []);

  const set = <K extends keyof ActivityFormValues>(k: K, val: ActivityFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const handleSave = async () => {
    if (!v.startTime) { toast.error('Start time is required'); return; }
    if (!v.activity.trim()) { toast.error('Activity name is required'); return; }
    if (v.endTime && v.startTime >= v.endTime) { toast.error('End time must be after start time'); return; }
    setSaving(true);
    try { await onSave({ ...v, activity: v.activity.trim() }); }
    finally { setSaving(false); }
  };

  return (
    <div className="border-b border-primary/30 bg-primary/[0.03] p-4 space-y-3 animate-fade-up">
      <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
        {initial?.activity ? 'Edit Activity' : 'New Activity'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] font-bold text-muted uppercase mb-1">Start</p>
          <TimePicker value={v.startTime} onChange={(val) => set('startTime', val)} />
        </div>
        <div>
          <p className="text-[9px] font-bold text-muted uppercase mb-1">End</p>
          <TimePicker value={v.endTime} onChange={(val) => set('endTime', val)} />
        </div>
      </div>
      <div>
        <p className="text-[9px] font-bold text-muted uppercase mb-1">Activity</p>
        <input
          ref={actRef}
          type="text"
          value={v.activity}
          onChange={(e) => set('activity', e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          placeholder="What did you do?"
          className="field text-sm"
        />
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold text-muted uppercase tracking-widest px-0.5">Category</p>
          <div className="grid grid-cols-3 gap-1.5 bg-surface-hover/20 p-1.5 rounded-xl border border-border/30">
            {CATEGORIES.map((c) => {
              const isSelected = v.category === c.name;
              const catVar = `var(--${c.name.toLowerCase()})`;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => set('category', c.name)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-extrabold transition-all border active:scale-95 ${
                    isSelected
                      ? 'shadow-sm border-transparent text-white font-bold'
                      : 'bg-surface hover:bg-surface-hover border-border/50 text-foreground'
                  }`}
                  style={{
                    backgroundColor: isSelected ? catVar : undefined,
                  }}
                >
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold text-muted uppercase mb-1">Notes</p>
          <input type="text" value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional (e.g. description)" className="field text-sm" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 py-2.5 text-sm">
          {saving ? <span className="spinner border-white/30 border-t-white" /> : <><Check className="w-4 h-4" /> Save</>}
        </button>
        <button onClick={onCancel} className="btn-ghost border border-border px-4 py-2.5 text-sm rounded-xl">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
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
  const [filterCategory, setFilterCategory] = useState<CategoryName | null>(null);
  const [pomodoroInitial, setPomodoroInitial] = useState<ActivityFormValues | null>(null);

  const handlePomodoroComplete = useCallback((durationMins: number, label: string) => {
    const now = new Date();
    const start = new Date(now.getTime() - durationMins * 60_000);
    const formatHM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    
    setPomodoroInitial({
      startTime: formatHM(start),
      endTime: formatHM(now),
      activity: label ? `Focus: ${label}` : 'Focus Session',
      category: 'Work',
      notes: 'Logged automatically via Pomodoro Timer.',
    });
    setShowAddRow(true);
    toast.success('Focus session complete! Check form below to log.');
  }, [toast]);

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

  const filteredActivities = React.useMemo(() => {
    if (!filterCategory) return activities;
    return activities.filter((a) => a.category === filterCategory);
  }, [activities, filterCategory]);

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
    setPomodoroInitial(null);
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

        {/* ── Mobile app-style widgets ──────────────────────────────────── */}
        <div className="flex sm:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          <AppMetricWidget
            label="Logged"
            value={fmtMins(metrics.total)}
            sub={`${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`}
            icon={Clock}
            accent="var(--primary)"
            bgClass="bg-primary/[0.07] border border-primary/10"
          />
          <AppMetricWidget
            label="Productive"
            value={fmtMins(metrics.productive)}
            sub="Work + Learn + Health"
            icon={Zap}
            accent="var(--health)"
            bgClass="bg-emerald-500/[0.07] border border-emerald-500/10"
          />
          <AppMetricWidget
            label="Score"
            value={`${metrics.score}%`}
            sub={metrics.score >= 70 ? 'High 🟢' : metrics.score >= 40 ? 'Average 🟡' : metrics.total === 0 ? 'No data' : 'Low 🔴'}
            icon={TrendingUp}
            accent={
              metrics.score >= 70 ? 'var(--health)'
              : metrics.score >= 40 ? 'var(--personal)'
              : 'var(--distraction)'
            }
            bgClass={
              metrics.score >= 70 ? 'bg-emerald-500/[0.07] border border-emerald-500/10'
              : metrics.score >= 40 ? 'bg-amber-500/[0.07] border border-amber-500/10'
              : 'bg-rose-500/[0.07] border border-rose-500/10'
            }
          />
          <AppMetricWidget
            label="Top"
            value={metrics.topCat ? `${CAT_MAP[metrics.topCat as CategoryName]?.emoji ?? ''} ${metrics.topCat}` : '—'}
            sub={metrics.topTime > 0 ? fmtMins(metrics.topTime) : 'No data yet'}
            icon={Layers}
            accent="var(--sleep)"
            bgClass="bg-indigo-500/[0.07] border border-indigo-500/10"
          />
        </div>
        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        {/* Desktop 2/4-col stat grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
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
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
              {CATEGORIES.map((cat) => {
                const catMin = activities
                  .filter((a) => a.category === cat.name && a.duration)
                  .reduce((s, a) => s + (a.duration ?? 0), 0);
                if (!catMin) return null;
                const isFiltered = filterCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setFilterCategory(isFiltered ? null : cat.name)}
                    className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-all active:scale-95 ${
                      isFiltered
                        ? 'bg-primary text-white border-transparent'
                        : 'text-muted hover:text-foreground border-transparent bg-surface-hover/50'
                    }`}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isFiltered ? 'white' : `var(--${cat.name.toLowerCase()})` }}
                    />
                    {cat.emoji} {cat.name}: {fmtMins(catMin)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main 2-column layout ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

          {/* Activity log - mobile card list + desktop table */}
          <div className="xl:col-span-2 md:card md:overflow-hidden -mx-4 sm:mx-0">
            {/* Desktop-only header (hidden on mobile - mobile uses section header inside) */}
            <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-base font-bold">
                    Activity Log
                    {activitiesLoading && <span className="spinner ml-2 w-3 h-3 border-[2px]" />}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    {isToday ? "Today" : currentDate} · {isLocked ? '🔒 Locked day' : `${filteredActivities.length} visible entr${filteredActivities.length === 1 ? 'y' : 'ies'}`}
                  </p>
                </div>
                {filterCategory && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 animate-fade-in self-center">
                    Filtered: {CAT_MAP[filterCategory].emoji} {filterCategory}
                    <button onClick={() => setFilterCategory(null)} className="ml-1 text-primary/70 hover:text-primary font-bold">×</button>
                  </span>
                )}
              </div>
              {!isLocked && !showAddRow && editingId === null && (
                <button
                  onClick={() => setShowAddRow(true)}
                  className="hidden md:flex btn btn-primary text-xs py-2 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Activity
                </button>
              )}
            </div>

            {/* ── Mobile card list (hidden on md+) ── */}
            <div className="md:hidden pt-2 pb-2">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold">
                      {isToday ? 'Today' : 'Activities'}
                      {activitiesLoading && <span className="spinner ml-2 w-3 h-3 border-[2px]" />}
                    </h2>
                    {activities.length > 0 && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {filteredActivities.length}
                      </span>
                    )}
                    {isLocked && <span className="text-[10px] text-muted">🔒</span>}
                  </div>
                  {filterCategory && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 animate-fade-in self-start">
                      Filtered: {CAT_MAP[filterCategory].emoji} {filterCategory}
                      <button onClick={() => setFilterCategory(null)} className="ml-1 text-primary/70 hover:text-primary font-bold">×</button>
                    </span>
                  )}
                </div>
              </div>

              {showAddRow && !isLocked && (
                <MobileAddForm
                  initial={pomodoroInitial || { ...EMPTY_FORM, startTime: defaultStartTime() }}
                  onSave={handleAdd}
                  onCancel={() => { setShowAddRow(false); setPomodoroInitial(null); }}
                />
              )}
              {activitiesLoading && activities.length === 0 && (
                <div className="space-y-3 px-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-3xl bg-surface border border-border p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="skeleton w-10 h-10 rounded-2xl" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3.5 w-2/3 rounded-full" />
                          <div className="skeleton h-2.5 w-1/3 rounded-full" />
                        </div>
                      </div>
                      <div className="skeleton h-px w-full rounded" />
                      <div className="mt-3 flex justify-between">
                        <div className="skeleton h-2.5 w-24 rounded-full" />
                        <div className="skeleton h-2.5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredActivities.map((act) => {
                const isEditing = editingId === act._id;
                const isDeleting = deletingId === act._id;
                return isEditing ? (
                  <MobileAddForm
                    key={act._id}
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
                  <MobileActivityCard
                    key={act._id}
                    act={act}
                    onEdit={() => handleEdit(act)}
                    onDelete={() => handleDelete(act._id)}
                    isDeleting={isDeleting}
                    isLocked={isLocked}
                  />
                );
              })}
              {activities.length === 0 && !showAddRow && !activitiesLoading && (
                <div className="flex flex-col items-center gap-4 py-16 px-8">
                  <div className="w-20 h-20 rounded-3xl bg-surface border border-border flex items-center justify-center text-4xl shadow-sm">
                    {isLocked ? '🔒' : '📋'}
                  </div>
                  <div className="text-center">
                    <p className="text-base font-extrabold">
                      {isLocked ? 'Day Locked' : 'Nothing logged yet'}
                    </p>
                    <p className="text-sm text-muted mt-1">
                      {isLocked ? 'No activities were recorded for this day.' : 'Tap the + button to log your first activity.'}
                    </p>
                  </div>
                </div>
              )}
              {activitiesLoading && activities.length === 0 && (
                <div className="space-y-3 px-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-3xl bg-surface border border-border p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="skeleton w-10 h-10 rounded-2xl" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3.5 w-2/3 rounded-full" />
                          <div className="skeleton h-2.5 w-1/3 rounded-full" />
                        </div>
                      </div>
                      <div className="skeleton h-px w-full rounded" />
                      <div className="mt-3 flex justify-between">
                        <div className="skeleton h-2.5 w-24 rounded-full" />
                        <div className="skeleton h-2.5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Desktop table (hidden on mobile) ── */}
            <div className="hidden md:block overflow-x-auto">
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
                      initial={pomodoroInitial || { ...EMPTY_FORM, startTime: defaultStartTime() }}
                      onSave={handleAdd}
                      onCancel={() => { setShowAddRow(false); setPomodoroInitial(null); }}
                      isNew
                    />
                  )}

                  {/* Existing activities */}
                  {filteredActivities.map((act) => {
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
                        {gap !== undefined && gap > 0 && !filterCategory && (
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

          {/* Timeline & Focus Widgets Column */}
          <div className="space-y-6">
            {!isLocked && (
              <PomodoroWidget onSessionComplete={handlePomodoroComplete} />
            )}

            <PeakHoursWidget activities={activities} />

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
      </div>
      </main>

      {/* ── Mobile FAB (Floating Add Button) ── */}
      {!isLocked && !showAddRow && editingId === null && (
        <button
          onClick={() => setShowAddRow(true)}
          className="md:hidden fixed bottom-[72px] right-5 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all hover:bg-primary-hover"
          aria-label="Add Activity"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

