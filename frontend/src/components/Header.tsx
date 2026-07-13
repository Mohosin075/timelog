'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp, getLocalDateString } from '../context/AppContext';
import {
  Clock, Calendar, BarChart3, Search, LogOut, Sun, Moon,
  User, ChevronLeft, ChevronRight, RotateCcw, Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Today',     href: '/',        icon: Clock },
  { name: 'History',   href: '/history', icon: Calendar },
  { name: 'Summary',   href: '/summary', icon: BarChart3 },
  { name: 'Search',    href: '/search',  icon: Search },
];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const Header: React.FC = () => {
  const { user, logout, theme, toggleTheme, currentDate, setCurrentDate } = useApp();
  const pathname = usePathname();

  const [clock, setClock] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const today = getLocalDateString();
  const isToday = currentDate === today;

  const navigateDate = (direction: -1 | 1) => {
    if (pathname !== '/') return;
    const d = new Date(`${currentDate}T00:00:00`);
    d.setDate(d.getDate() + direction);
    const next = getLocalDateString(d);
    if (next > today) return;
    setCurrentDate(next);
  };

  // Initials for avatar
  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      {/* ─── DESKTOP HEADER ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6 hidden md:block">
        <div className="max-w-7xl mx-auto h-14 flex items-center gap-4">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              TimeLog
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 border border-transparent ${
                    active
                      ? 'bg-primary-faint text-primary border-primary/10 shadow-sm'
                      : 'text-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {name}
                </Link>
              );
            })}
          </nav>

          {/* Date navigator */}
          {pathname === '/' && (
            <div className="flex items-center gap-1 border border-border rounded-xl px-1 py-1 bg-surface shadow-sm hover:border-primary/30 transition-colors">
              <button onClick={() => navigateDate(-1)} className="btn-icon p-1.5" title="Previous day">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-xs font-bold text-foreground">
                  {isToday ? 'Today' : formatDisplayDate(currentDate)}
                </span>
              </div>
              <button onClick={() => navigateDate(1)} disabled={isToday} className="btn-icon p-1.5 disabled:opacity-30" title="Next day">
                <ChevronRight className="w-4 h-4" />
              </button>
              {!isToday && (
                <button onClick={() => setCurrentDate(today)} className="text-[10px] text-primary font-bold px-2 hover:underline" title="Back to Today">
                  Today
                </button>
              )}
            </div>
          )}

          {/* Live Clock */}
          <div className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5 bg-surface shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-xs font-semibold text-foreground tabular-nums">{clock}</span>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="btn-icon" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* User menu */}
          <div className="flex items-center gap-2 border border-border rounded-xl pl-2.5 pr-1.5 py-1 bg-surface shadow-sm">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold max-w-[100px] truncate">{user.name}</span>
            <button onClick={logout} className="btn-icon danger ml-1" title="Log out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MOBILE APP BAR ──────────────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-50">
        {/* Top app bar */}
        <div className="bg-background/90 backdrop-blur-2xl border-b border-border/40 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">

            {/* Left: App brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/40">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted leading-none">{getGreeting()}</p>
                <p className="text-sm font-extrabold text-foreground leading-tight">{user.name.split(' ')[0]}</p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
              {/* Live clock pill */}
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] font-bold text-foreground tabular-nums">{clock}</span>
              </div>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center active:scale-90 transition-all"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
              {/* User avatar */}
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-md shadow-primary/30 active:scale-90 transition-all"
              >
                <span className="text-[11px] font-extrabold text-white">{initials}</span>
              </button>
            </div>
          </div>

          {/* Date navigator pill — only on home */}
          {pathname === '/' && (
            <div className="mt-2.5 flex items-center justify-center">
              <div className="flex items-center gap-0 bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => navigateDate(-1)}
                  className="flex items-center justify-center w-9 h-9 text-muted hover:text-foreground active:bg-surface-hover transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 flex flex-col items-center min-w-[130px]">
                  <span className="text-[13px] font-extrabold text-foreground tracking-tight">
                    {isToday ? '📅 Today' : formatDisplayDate(currentDate)}
                  </span>
                  {!isToday && (
                    <span className="text-[9px] text-muted font-semibold">{formatLongDate(currentDate)}</span>
                  )}
                </div>
                <button
                  onClick={() => navigateDate(1)}
                  disabled={isToday}
                  className="flex items-center justify-center w-9 h-9 text-muted hover:text-foreground disabled:opacity-25 active:bg-surface-hover transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!isToday && (
                  <button
                    onClick={() => setCurrentDate(today)}
                    className="flex items-center justify-center w-9 h-9 text-primary hover:bg-primary-faint active:scale-90 transition-all border-l border-border"
                    title="Back to Today"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown (mobile) */}
        {showUserMenu && (
          <div
            className="absolute right-4 top-full mt-1 w-48 bg-surface border border-border rounded-2xl shadow-lg shadow-black/10 p-1 z-50 animate-scale-in"
            onBlur={() => setShowUserMenu(false)}
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-xs font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
        {showUserMenu && (
          <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
        )}
      </div>

      {/* ─── MOBILE BOTTOM NAV ───────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <div className="relative">
          {/* Glass background */}
          <div className="bg-background/85 backdrop-blur-2xl border-t border-border/50 px-1 pt-2 pb-5">
            <div className="flex items-end justify-around">
              {NAV_ITEMS.map(({ name, href, icon: Icon }, idx) => {
                const active = pathname === href;
                // Insert center slot after index 1
                return (
                  <React.Fragment key={href}>
                    {idx === 2 && (
                      <div className="w-16" /> // center FAB spacer
                    )}
                    <Link
                      href={href}
                      className="relative flex flex-col items-center gap-1 py-1 px-3 min-w-[54px] group"
                    >
                      {/* Active indicator dot */}
                      <span className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 w-1 h-1 rounded-full transition-all duration-300 ${active ? 'bg-primary scale-100' : 'scale-0'}`} />
                      <div className={`p-2 rounded-2xl transition-all duration-200 ${
                        active
                          ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-105'
                          : 'text-muted group-active:scale-90 group-active:bg-surface-hover'
                      }`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${
                        active ? 'text-primary' : 'text-muted'
                      }`}>{name}</span>
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
