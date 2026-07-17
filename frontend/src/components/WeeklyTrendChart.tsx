'use client';

import React, { useState } from 'react';

interface WeeklyTrendChartProps {
  data: { date: string; score: number }[];
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center bg-surface-hover/30 rounded-2xl border border-dashed border-border text-xs text-muted">
        Not enough historical data to display trend
      </div>
    );
  }

  const width = 500;
  const height = 150;
  const paddingLeft = 25;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxVal = 100;
  
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.score / maxVal) * chartHeight;
    return { x, y, score: d.score, date: d.date };
  });

  let areaPath = '';
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaPath = linePath + ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Productivity Score Trend</h4>
      </div>

      <div className="relative bg-surface-hover/10 p-2 rounded-2xl border border-border/30">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 50, 100].map((gridVal) => {
            const y = paddingTop + chartHeight - (gridVal / maxVal) * chartHeight;
            return (
              <g key={gridVal}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted/70 text-[8px] font-mono font-bold"
                >
                  {gridVal}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((p, i) => {
            const colWidth = chartWidth / data.length;
            const xLeft = p.x - colWidth / 2;
            return (
              <rect
                key={i}
                x={xLeft}
                y={paddingTop}
                width={colWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {points.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                {i % 2 === 0 && (
                  <text
                    x={p.x}
                    y={height - 4}
                    textAnchor="middle"
                    className="fill-muted text-[8px] font-bold"
                  >
                    {formatDateLabel(p.date)}
                  </text>
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3}
                  fill="var(--background)"
                  stroke="var(--primary)"
                  strokeWidth={isHovered ? 3 : 1.5}
                  className="transition-all duration-150 pointer-events-none"
                />
              </g>
            );
          })}
        </svg>

        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute bg-surface/90 border border-border shadow-xl rounded-xl p-2 text-[10px] space-y-0.5 pointer-events-none transition-all duration-150 animate-fade-in z-20"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              top: `${(points[hoveredIdx].y / height) * 100 - 32}%`,
              transform: 'translateX(-50%)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <p className="font-extrabold text-foreground">{formatDateLabel(points[hoveredIdx].date)}</p>
            <p className="font-bold text-primary">Score: {points[hoveredIdx].score}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
