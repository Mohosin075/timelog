'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // "HH:MM" (24-hour format)
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = '00:00',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Floating coordinates for viewport positioning (bypasses table clipping)
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Material clock states
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>('AM');
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Update floating dialog coordinates relative to input viewport bounding box
  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
    }
  };

  // Sync prop changes to local input value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Sync modal state & layout coordinates when opened
  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(value);
      setTempHour(parsed.hour);
      setTempMinute(parsed.minute);
      setTempPeriod(parsed.period);
      setMode('hour');
      setShowKeyboard(false);

      updateCoords();
      // Listen to scroll (capture phase for inner table wrapper scrolls) and resize
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [isOpen, value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node) &&
        // Also check that we didn't click inside the fixed dropdown itself
        !(e.target as HTMLElement).closest('.time-picker-dropdown')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 12-hour parser
  const parseTime = (val: string) => {
    let [hStr, mStr] = (val || '00:00').split(':');
    let h = parseInt(hStr, 10) || 0;
    let m = parseInt(mStr, 10) || 0;

    let period: 'AM' | 'PM' = 'AM';
    let displayHour = h;
    if (h >= 12) {
      period = 'PM';
      if (h > 12) displayHour = h - 12;
    } else if (h === 0) {
      displayHour = 12;
    }

    return {
      hour: displayHour,
      minute: m,
      period,
    };
  };

  // 24-hour formatter
  const formatTime = (h: number, m: number, period: 'AM' | 'PM') => {
    let finalHour = h;
    if (period === 'PM') {
      if (h < 12) finalHour = h + 12;
    } else {
      if (h === 12) finalHour = 0;
    }
    return `${String(finalHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleHourSelect = (h: number) => {
    setTempHour(h);
    setMode('minute');
  };

  const handleMinuteSelect = (m: number) => {
    setTempMinute(m);
  };

  const handleSaveClick = () => {
    const finalVal = formatTime(tempHour, tempMinute, tempPeriod);
    setInputValue(finalVal);
    onChange(finalVal);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw.length > 4) raw = raw.slice(0, 4);

    let formatted = raw;
    if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}:${raw.slice(2)}`;
    }
    setInputValue(formatted);

    if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(formatted)) {
      onChange(formatted);
    }
  };

  const handleInputBlur = () => {
    if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(inputValue)) {
      onChange(inputValue);
    } else {
      setInputValue(value);
    }
  };

  const HOUR_VALUES = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTE_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const hrIdx = HOUR_VALUES.indexOf(tempHour);
  const hourAngle = hrIdx !== -1 ? hrIdx * 30 : 0;
  const minuteAngle = tempMinute * 6;
  const handAngle = mode === 'hour' ? hourAngle : minuteAngle;

  const getSelectedCoords = () => {
    if (mode === 'hour') {
      const idx = HOUR_VALUES.indexOf(tempHour);
      const angle = (idx * 30 - 90) * (Math.PI / 180);
      const r = 66;
      return {
        x: 96 + r * Math.cos(angle),
        y: 96 + r * Math.sin(angle),
        val: String(tempHour),
      };
    } else {
      const angle = (tempMinute * 6 - 90) * (Math.PI / 180);
      const r = 74;
      return {
        x: 96 + r * Math.cos(angle),
        y: 96 + r * Math.sin(angle),
        val: String(tempMinute).padStart(2, '0'),
      };
    }
  };

  const coordsHighlight = getSelectedCoords();

  const renderClockNumbers = () => {
    if (mode === 'hour') {
      return HOUR_VALUES.map((h, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r = 66;
        const x = 96 + r * Math.cos(angle);
        const y = 96 + r * Math.sin(angle);
        const isSelected = h === tempHour;

        return (
          <button
            key={h}
            type="button"
            onClick={() => handleHourSelect(h)}
            className={`absolute w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
              isSelected ? 'opacity-0 scale-50 pointer-events-none' : 'text-foreground hover:bg-primary-faint'
            }`}
            style={{ left: `${x - 14}px`, top: `${y - 14}px` }}
          >
            {h}
          </button>
        );
      });
    } else {
      return MINUTE_PRESETS.map((m, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r = 74;
        const x = 96 + r * Math.cos(angle);
        const y = 96 + r * Math.sin(angle);
        const isSelected = m === tempMinute;

        return (
          <button
            key={m}
            type="button"
            onClick={() => handleMinuteSelect(m)}
            className={`absolute w-7 h-7 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
              isSelected ? 'opacity-0 scale-50 pointer-events-none' : 'text-foreground hover:bg-primary-faint'
            }`}
            style={{ left: `${x - 14}px`, top: `${y - 14}px` }}
          >
            {String(m).padStart(2, '0')}
          </button>
        );
      });
    }
  };

  return (
    <div ref={rootRef} className={`relative inline-block w-full ${className}`}>
      
      {/* Table Input field (No absolute overlay button to prevent digit overlap) */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="field text-center font-mono font-bold tracking-wide cursor-pointer"
      />

      {/* Floating Viewport-fixed Material Dialog */}
      {isOpen && (
        <div
          className="time-picker-dropdown bg-surface border border-border shadow-2xl rounded-2xl p-4 flex flex-col gap-4 animate-scale-in glass select-none"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '270px',
          }}
        >
          
          {/* Header section (Large display digits) */}
          <div className="flex flex-col gap-1">
            <p className="text-[9px] font-bold text-muted uppercase tracking-widest px-0.5">Select Time</p>
            <div className="flex items-center justify-between gap-2.5">
              
              <div className="flex items-center gap-1">
                {/* Hour selection button */}
                <button
                  type="button"
                  onClick={() => setMode('hour')}
                  className={`w-16 h-14 rounded-xl flex items-center justify-center text-3xl font-extrabold font-mono transition-all ${
                    mode === 'hour'
                      ? 'bg-primary/10 text-primary border border-primary/20 scale-105 shadow-sm'
                      : 'bg-surface-hover text-foreground hover:bg-surface-hover/80 border border-transparent'
                  }`}
                >
                  {String(tempHour).padStart(2, '0')}
                </button>

                <span className="text-2xl font-bold text-foreground px-0.5 animate-pulse">:</span>

                {/* Minute selection button */}
                <button
                  type="button"
                  onClick={() => setMode('minute')}
                  className={`w-16 h-14 rounded-xl flex items-center justify-center text-3xl font-extrabold font-mono transition-all ${
                    mode === 'minute'
                      ? 'bg-primary/10 text-primary border border-primary/20 scale-105 shadow-sm'
                      : 'bg-surface-hover text-foreground hover:bg-surface-hover/80 border border-transparent'
                  }`}
                >
                  {String(tempMinute).padStart(2, '0')}
                </button>
              </div>

              {/* AM/PM toggle columns */}
              <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-surface shadow-sm text-[10px] font-extrabold w-12 h-14 text-center shrink-0 justify-stretch">
                <button
                  type="button"
                  onClick={() => setTempPeriod('AM')}
                  className={`flex-1 flex items-center justify-center transition-colors border-b border-border/40 ${
                    tempPeriod === 'AM' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setTempPeriod('PM')}
                  className={`flex-1 flex items-center justify-center transition-colors ${
                    tempPeriod === 'PM' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60 w-full" />

          {/* Clock View or Keyboard input view */}
          {!showKeyboard ? (
            /* Clock Dial Visual View */
            <div className="relative w-48 h-48 rounded-full bg-surface-hover/80 border border-border/40 mx-auto flex items-center justify-center select-none">
              
              {/* Radial Center Dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-primary absolute z-10" />

              {/* Rotating Pointer Hand Line */}
              <div
                className="absolute left-[calc(50%-1px)] bottom-[50%] w-0.5 bg-primary origin-bottom transition-all duration-200"
                style={{
                  height: mode === 'hour' ? '66px' : '74px',
                  transform: `rotate(${handAngle}deg)`,
                }}
              />

              {/* Absolutely Positioned Selection Circle (prevents text rotation during rotations) */}
              <div
                className="absolute w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow shadow-primary/30 z-10 transition-all duration-200 pointer-events-none"
                style={{ left: `${coordsHighlight.x - 14}px`, top: `${coordsHighlight.y - 14}px` }}
              >
                <span className="text-white font-extrabold text-xs font-mono">{coordsHighlight.val}</span>
              </div>

              {/* Positioned Numbers overlay */}
              {renderClockNumbers()}

            </div>
          ) : (
            /* Direct Keyboard Input View */
            <div className="flex flex-col items-center justify-center h-48 space-y-3 select-none">
              <div className="flex items-center gap-3">
                {/* Hour field */}
                <div className="flex flex-col items-center">
                  <input
                    type="text"
                    maxLength={2}
                    value={String(tempHour).padStart(2, '0')}
                    onChange={(e) => {
                      let val = parseInt(e.target.value, 10) || 0;
                      if (val > 12) val = 12;
                      if (val < 1) val = 1;
                      setTempHour(val);
                    }}
                    className="field w-14 h-14 text-center text-2xl font-extrabold font-mono bg-surface-hover focus:bg-surface border border-border"
                  />
                  <span className="text-[9px] text-muted font-bold mt-1 uppercase tracking-wider">Hour</span>
                </div>
                <span className="text-2xl font-bold text-foreground pb-4">:</span>
                {/* Minute field */}
                <div className="flex flex-col items-center">
                  <input
                    type="text"
                    maxLength={2}
                    value={String(tempMinute).padStart(2, '0')}
                    onChange={(e) => {
                      let val = parseInt(e.target.value, 10) || 0;
                      if (val > 59) val = 59;
                      if (val < 0) val = 0;
                      setTempMinute(val);
                    }}
                    className="field w-14 h-14 text-center text-2xl font-extrabold font-mono bg-surface-hover focus:bg-surface border border-border"
                  />
                  <span className="text-[9px] text-muted font-bold mt-1 uppercase tracking-wider">Min</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls (Keyboard toggle + Actions) */}
          <div className="border-t border-border/60 pt-3 flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={() => setShowKeyboard((prev) => !prev)}
              className="btn-icon"
              title={showKeyboard ? 'Select via Clock face' : 'Select via Keyboard'}
            >
              {showKeyboard ? (
                <Clock className="w-4.5 h-4.5 text-muted hover:text-primary transition-colors" />
              ) : (
                <svg
                  className="w-4.5 h-4.5 text-muted hover:text-primary transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M7 16h10" />
                </svg>
              )}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-muted hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                className="text-[11px] font-extrabold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg hover:shadow-sm transition-colors border border-transparent hover:border-primary/20"
              >
                OK
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
