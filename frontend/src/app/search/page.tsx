'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { api } from '@/services/api';
import { useToast } from '@/components/ToastProvider';
import { Search, Calendar, Clock, Layers } from 'lucide-react';

interface SearchResult {
  _id: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  activity: string;
  category: string;
  notes?: string;
}

const CAT_BADGE: Record<string, string> = {
  Work: 'badge-work',
  Learning: 'badge-learning',
  Health: 'badge-health',
  Personal: 'badge-personal',
  Distraction: 'badge-distraction',
  Sleep: 'badge-sleep',
};

const CAT_EMOJI: Record<string, string> = {
  Work: '💼', Learning: '📚', Health: '🏃', Personal: '🏠', Distraction: '📱', Sleep: '😴',
};

function fmtMins(m: number): string {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  return h ? `${h}h` : `${min}m`;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
    ) : part
  );
}

export default function SearchPage() {
  const { user, isAuthenticated, isLoading } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api.get<{ success: boolean; results: SearchResult[] }>(
        `/activities/search?q=${encodeURIComponent(trimmed)}`
      );
      setResults(res.results);
    } catch (err: any) {
      toast.error('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="spinner w-8 h-8 border-[3px]" />
      </div>
    );
  }

  // Group results by date
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push(r);
  }
  const sortedDates = Object.keys(grouped).sort().reverse();

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0 bg-background">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Search Activities</h1>
          <p className="text-xs text-muted mt-1">Search your complete activity history by name or notes.</p>
        </div>

        {/* Search input */}
        <div className="card card-hover p-5 hover:border-primary/20 transition-all duration-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            {searching && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 spinner w-4 h-4" />
            )}
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder='Search by activity or notes (e.g. "Next.js", "client meeting")'
              className="field !pl-10 !pr-10 text-sm py-3 shadow-inner"
            />
          </div>
          {query && (
            <p className="text-[11px] text-muted mt-2 px-1 animate-fade-in">
              Press <kbd className="bg-surface-hover border border-border rounded px-1 py-0.5 font-mono text-[9px] font-bold">Enter</kbd> to search ·{' '}
              <kbd className="bg-surface-hover border border-border rounded px-1 py-0.5 font-mono text-[9px] font-bold">Esc</kbd> to clear
            </p>
          )}
        </div>

        {/* Results */}
        {hasSearched && !searching && (
          <div className="flex items-center gap-2 text-xs text-muted font-semibold">
            <Layers className="w-3.5 h-3.5" />
            {results.length > 0
              ? `${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`
              : `No results for "${query}"`}
          </div>
        )}

        {/* Grouped results */}
        {sortedDates.length > 0 && (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date} className="card overflow-hidden">
                {/* Date header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-hover border-b border-border">
                  <Calendar className="w-3.5 h-3.5 text-muted" />
                  <span className="text-xs font-bold">
                    {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  <span className="ml-auto text-[10px] text-muted">{grouped[date].length} entr{grouped[date].length === 1 ? 'y' : 'ies'}</span>
                </div>

                {/* Entries for this date */}
                <div className="divide-y divide-border">
                  {grouped[date].map((result) => (
                    <div key={result._id} className="flex items-start gap-3 px-4 py-3 hover:bg-primary/5 transition-colors">
                      {/* Time + duration column */}
                      <div className="shrink-0 min-w-[80px] text-right">
                        <p className="font-mono text-xs font-bold">{result.startTime}</p>
                        {result.endTime && (
                          <p className="font-mono text-[10px] text-muted">→ {result.endTime}</p>
                        )}
                        {result.duration !== undefined && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-muted" />
                            <span className="text-[10px] text-muted font-semibold">{fmtMins(result.duration)}</span>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="w-px bg-border self-stretch shrink-0" />

                      {/* Activity details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">
                          {highlightMatch(result.activity, query)}
                        </p>
                        {result.notes && (
                          <p className="text-xs text-muted mt-0.5">
                            {highlightMatch(result.notes, query)}
                          </p>
                        )}
                      </div>

                      {/* Category badge */}
                      <span className={`badge ${CAT_BADGE[result.category] ?? ''} shrink-0`}>
                        {CAT_EMOJI[result.category] ?? ''} {result.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Initial empty state */}
        {!hasSearched && !searching && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center">
              <Search className="w-8 h-8 text-muted" />
            </div>
            <div>
              <p className="text-sm font-bold">Search your activity history</p>
              <p className="text-xs text-muted mt-1">Type an activity name, keyword, or notes to find past entries.</p>
            </div>
          </div>
        )}

        {/* No results state */}
        {hasSearched && !searching && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-sm font-bold">No activities match &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-muted">Try a different keyword or check your spelling.</p>
          </div>
        )}

      </main>
    </div>
  );
}
