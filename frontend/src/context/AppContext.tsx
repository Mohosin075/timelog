'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useRouter } from 'next/navigation';

// ─── Domain Types ───────────────────────────────────────────────────────────

export type ActivityCategory = 'Work' | 'Learning' | 'Health' | 'Personal' | 'Distraction' | 'Sleep';

export interface IActivity {
  _id: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  activity: string;
  category: ActivityCategory;
  notes?: string;
  createdAt?: string;
}

export interface IUnclosedDay {
  date: string;
  activityId: string;
  activityName: string;
  startTime: string;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
}

// ─── Context Shape ───────────────────────────────────────────────────────────

interface AppContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  currentDate: string;
  activities: IActivity[];
  isLocked: boolean;
  unclosedDays: IUnclosedDay[];
  isLoading: boolean;          // global (auth init)
  activitiesLoading: boolean;  // per-request fetch
  theme: 'light' | 'dark';

  setCurrentDate: (date: string) => void;
  fetchActivities: (date?: string) => Promise<void>;
  addActivity: (data: Omit<IActivity, '_id' | 'duration' | 'createdAt'>) => Promise<void>;
  updateActivity: (id: string, data: Partial<IActivity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  toggleTheme: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getLocalDateString = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TOKEN_KEY = 'timelog_token';
const THEME_KEY = 'timelog_theme';

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const [user, setUser] = useState<IUser | null>(null);
  const [currentDate, setCurrentDateState] = useState<string>(getLocalDateString());
  const [activities, setActivities] = useState<IActivity[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [unclosedDays, setUnclosedDays] = useState<IUnclosedDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);        // auth bootstrap
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // ── Theme ─────────────────────────────────────────────────────────────────
  const applyTheme = useCallback((t: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', t === 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, [applyTheme]);

  // ── Date navigation ───────────────────────────────────────────────────────
  const setCurrentDate = useCallback((date: string) => {
    setCurrentDateState(date);
  }, []);

  // ── Fetch activities ──────────────────────────────────────────────────────
  const fetchActivities = useCallback(async (date?: string) => {
    const targetDate = date ?? currentDate;
    const todayStr = getLocalDateString();
    setActivitiesLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        isLocked: boolean;
        activities: IActivity[];
        unclosedDays: IUnclosedDay[];
      }>(`/activities?date=${targetDate}&clientLocalDate=${todayStr}`);

      setActivities(res.activities);
      setIsLocked(res.isLocked);
      setUnclosedDays(res.unclosedDays);
    } finally {
      setActivitiesLoading(false);
    }
  }, [currentDate]);

  // ── Bootstrap auth on mount ────────────────────────────────────────────────
  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'dark';
    applyTheme(savedTheme);
    setTimeout(() => setTheme(savedTheme), 0);

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get<{ success: boolean; user: IUser }>('/auth/me');
        setUser(res.user);
      } catch {
        // Token invalid — clear it silently
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [applyTheme]);

  // ── Fetch activities when date or user changes ────────────────────────────
  useEffect(() => {
    if (user) fetchActivities(currentDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, user]);


  // ── Add activity ──────────────────────────────────────────────────────────
  const addActivity = useCallback(async (data: Omit<IActivity, '_id' | 'duration' | 'createdAt'>) => {
    await api.post('/activities', { ...data, clientLocalDate: getLocalDateString() });
    await fetchActivities(data.date);
  }, [fetchActivities]);

  // ── Update activity ───────────────────────────────────────────────────────
  const updateActivity = useCallback(async (id: string, data: Partial<IActivity>) => {
    await api.put(`/activities/${id}`, { ...data, clientLocalDate: getLocalDateString() });
    await fetchActivities();
  }, [fetchActivities]);

  // ── Delete activity ───────────────────────────────────────────────────────
  const deleteActivity = useCallback(async (id: string) => {
    await api.delete(`/activities/${id}?clientLocalDate=${getLocalDateString()}`);
    await fetchActivities();
  }, [fetchActivities]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; token: string; user: IUser }>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    router.push('/');
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<{ success: boolean; token: string; user: IUser }>('/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    router.push('/');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setActivities([]);
    setUnclosedDays([]);
    setIsLocked(false);
    router.push('/login');
  }, [router]);

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated: !!user,
      currentDate,
      activities,
      isLocked,
      unclosedDays,
      isLoading,
      activitiesLoading,
      theme,
      setCurrentDate,
      fetchActivities,
      addActivity,
      updateActivity,
      deleteActivity,
      login,
      register,
      logout,
      toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
