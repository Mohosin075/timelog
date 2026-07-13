'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp, getLocalDateString } from '../context/AppContext';
import {
  Clock, Calendar, BarChart3, Search, LogOut, Sun, Moon,
  User, ChevronLeft, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Today', href: '/', icon: Clock },
  { name: 'History', href: '/history', icon: Calendar },
  { name: 'Summaries', href: '/summary', icon: BarChart3 },
  { name: 'Search', href: '/search', icon: Search },
];

// Format YYYY-MM-DD to "Mon, 13 Jul"
function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const Header: React.FC = () => {
  const { user, logout, theme, toggleTheme, currentDate, setCurrentDate } = useApp();
  const pathname = usePathname();

  // Live clock
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const today = getLocalDateString();
  const isToday = currentDate === today;

  const navigateDate = (direction: -1 | 1) => {
    // Only navigate dates on the home page
    if (pathname !== '/') return;
    const d = new Date(`${currentDate}T00:00:00`);
    d.setDate(d.getDate() + direction);
    const next = getLocalDateString(d);
    // Don't allow future dates beyond today
    if (next > today) return;
    setCurrentDate(next);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6">
        <div className="max-w-7xl mx-auto h-14 flex items-center gap-4">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent hidden sm:block">
              TimeLog
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 border border-transparent ${
                    active
                      ? 'bg-primary-faint text-primary border-primary/10 shadow-sm'
                      : 'text-muted hover:text-foreground hover:bg-surface-hover hover:scale-[1.02]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {name}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1 md:flex-none" />

          {/* Date navigator — only on home page */}
          {pathname === '/' && (
            <div className="flex items-center gap-1 border border-border rounded-xl px-1 py-1 bg-surface shadow-sm hover:border-primary/30 transition-colors">
              <button
                onClick={() => navigateDate(-1)}
                className="btn-icon p-1.5"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center min-w-[96px]">
                <span className="text-xs font-semibold text-foreground">
                  {isToday ? 'Today' : formatDisplayDate(currentDate)}
                </span>
                {!isToday && (
                  <span className="text-[10px] text-muted">{formatDisplayDate(currentDate)}</span>
                )}
              </div>
              <button
                onClick={() => navigateDate(1)}
                disabled={isToday}
                className="btn-icon p-1.5 disabled:opacity-30"
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {!isToday && (
                <button
                  onClick={() => setCurrentDate(today)}
                  className="text-[10px] text-primary font-semibold px-2 hover:underline"
                >
                  Back to Today
                </button>
              )}
            </div>
          )}

          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5 bg-surface shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-xs font-semibold text-foreground tabular-nums">{clock}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn-icon"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4 text-indigo-500" />
            }
          </button>

          {/* User menu */}
          <div className="flex items-center gap-2 border border-border rounded-xl pl-2.5 pr-1.5 py-1 bg-surface shadow-sm">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:block">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="btn-icon danger ml-1"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border bg-background/90 backdrop-blur-xl safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
                  active ? 'text-primary' : 'text-muted'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
                <span className="text-[10px] font-semibold">{name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

