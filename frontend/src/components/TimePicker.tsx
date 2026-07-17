'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Keyboard } from 'lucide-react';

interface TimePickerProps {
  value: string; // "HH:MM" (24-hour format)
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = '00:00 AM',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  // Floating coordinates for viewport positioning (bypasses table clipping)
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // State
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>('AM');
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const HOUR_VALUES = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTE_VALUES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Convert 24h ("14:15") to 12h display ("02:15 PM")
  const formatDisplayTime = (val24: string) => {
    if (!val24) return '';
    const [hStr, mStr] = val24.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = mStr || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${m} ${period}`;
  };

  // Convert 12h display ("02:15 PM") to 24h ("14:15")
  const parseDisplayTime = (displayVal: string) => {
    const match = displayVal.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
    }
  };

  // Sync prop changes to local display value
  useEffect(() => {
    setInputValue(formatDisplayTime(value));
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(value);
      setTempHour(parsed.hour);
      setTempMinute(parsed.minute);
      setTempPeriod(parsed.period);
      setMode('hour');
      setShowKeyboard(false);

      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.time-picker-dropdown')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
    const finalVal24 = formatTime(tempHour, tempMinute, tempPeriod);
    setInputValue(formatDisplayTime(finalVal24));
    onChange(finalVal24);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setInputValue(val);

    // Auto-parse if they typed a fully valid format like "07:15 PM" or "7:15 PM"
    const parsed24 = parseDisplayTime(val);
    if (parsed24) {
      onChange(parsed24);
    }
  };

  const handleInputBlur = () => {
    const parsed24 = parseDisplayTime(inputValue);
    if (parsed24) {
      onChange(parsed24);
      setInputValue(formatDisplayTime(parsed24));
    } else {
      setInputValue(formatDisplayTime(value));
    }
  };

  const hrIdx = HOUR_VALUES.indexOf(tempHour);
  const hourAngle = hrIdx !== -1 ? hrIdx * 30 : 0;
  const minuteAngle = tempMinute * 6;
  const handAngle = mode === 'hour' ? hourAngle : minuteAngle;
  const handRadius = 68; // Consistent radius for 12-hour clean design

  const getSelectedCoords = () => {
    const rad = (handAngle - 90) * (Math.PI / 180);
    return {
      x: 96 + handRadius * Math.cos(rad),
      y: 96 + handRadius * Math.sin(rad),
      val: mode === 'hour' ? String(tempHour) : String(tempMinute).padStart(2, '0'),
    };
  };

  const coordsHighlight = getSelectedCoords();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showKeyboard) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateTimeFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateTimeFromPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (mode === 'hour') {
        setTimeout(() => setMode('minute'), 250);
      }
    }
  };

  const updateTimeFromPointer = (e: React.PointerEvent) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    let angle = (Math.atan2(y, x) * 180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hour') {
      let hrIdx = Math.round(angle / 30);
      if (hrIdx === 12) hrIdx = 0;
      setTempHour(HOUR_VALUES[hrIdx]);
    } else {
      // Snap to 5-minute increments for smooth, clean dragging on the analog face
      let minIdx = Math.round(angle / 30);
      if (minIdx === 12) minIdx = 0;
      setTempMinute(minIdx * 5);
    }
  };

  const renderClockNumbers = () => {
    const isHourMode = mode === 'hour';

    const hourLayout = (
      <div className={`absolute inset-0 transition-all duration-300 ${isHourMode ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
        {HOUR_VALUES.map((h, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 96 + handRadius * Math.cos(angle);
          const y = 96 + handRadius * Math.sin(angle);
          const isSelected = h === tempHour && isHourMode;

          return (
            <button
              key={`hour-${h}`}
              type="button"
              onClick={() => handleHourSelect(h)}
              className={`absolute w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                isSelected ? 'opacity-0 scale-50 pointer-events-none' : 'text-foreground hover:bg-primary/10'
              }`}
              style={{ left: `${x - 14}px`, top: `${y - 14}px` }}
            >
              {h}
            </button>
          );
        })}
      </div>
    );

    const minuteLayout = (
      <div className={`absolute inset-0 transition-all duration-300 ${!isHourMode ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
        {MINUTE_VALUES.map((m, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 96 + handRadius * Math.cos(angle);
          const y = 96 + handRadius * Math.sin(angle);
          const isSelected = m === tempMinute && !isHourMode;

          return (
            <button
              key={`min-${m}`}
              type="button"
              onClick={() => handleMinuteSelect(m)}
              className={`absolute w-7 h-7 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                isSelected ? 'opacity-0 scale-50 pointer-events-none' : 'text-foreground hover:bg-primary/10'
              }`}
              style={{ left: `${x - 14}px`, top: `${y - 14}px` }}
            >
              {String(m).padStart(2, '0')}
            </button>
          );
        })}
      </div>
    );

    return (
      <>
        {hourLayout}
        {minuteLayout}
      </>
    );
  };

  return (
    <div ref={rootRef} className={`relative inline-block w-full ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`field text-center font-mono font-bold tracking-wide cursor-pointer transition-all duration-200 ${
          isOpen ? 'ring-2 ring-primary/20 border-primary shadow-lg shadow-primary/5' : ''
        }`}
      />

      {isOpen && (
        <div
          className="time-picker-dropdown bg-surface border border-border shadow-2xl rounded-2xl p-4 flex flex-col gap-4 animate-scale-in glass select-none"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '250px',
          }}
        >
          {/* Header section (Large display digits + AM/PM toggle) */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest px-0.5">Select Time</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {/* Hour selection button */}
                <button
                  type="button"
                  onClick={() => setMode('hour')}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-extrabold font-mono transition-all ${
                    mode === 'hour'
                      ? 'bg-primary/10 text-primary border border-primary/20 scale-105 shadow-sm'
                      : 'bg-surface-hover text-foreground hover:bg-surface-hover/80 border border-transparent'
                  }`}
                >
                  {String(tempHour)}
                </button>

                <span className="text-xl font-bold text-muted animate-pulse">:</span>

                {/* Minute selection button */}
                <button
                  type="button"
                  onClick={() => setMode('minute')}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-extrabold font-mono transition-all ${
                    mode === 'minute'
                      ? 'bg-primary/10 text-primary border border-primary/20 scale-105 shadow-sm'
                      : 'bg-surface-hover text-foreground hover:bg-surface-hover/80 border border-transparent'
                  }`}
                >
                  {String(tempMinute).padStart(2, '0')}
                </button>
              </div>

              {/* AM/PM toggle box */}
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

          {/* Analog Clock Dial Visual View */}
          {!showKeyboard ? (
            <div 
              ref={clockRef}
              className="relative w-48 h-48 rounded-full bg-surface-hover/80 border border-border/40 mx-auto flex items-center justify-center select-none cursor-pointer touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Radial Center Dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-primary absolute z-10 pointer-events-none" />

              {/* Rotating Pointer Hand Line */}
              <div
                className={`absolute left-[calc(50%-1px)] bottom-[50%] w-0.5 bg-primary origin-bottom pointer-events-none ${isDragging ? '' : 'transition-all duration-200'}`}
                style={{
                  height: `${handRadius}px`,
                  transform: `rotate(${handAngle}deg)`,
                }}
              />

              {/* Absolutely Positioned Selection Circle */}
              <div
                className={`absolute w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow shadow-primary/30 z-10 pointer-events-none ${isDragging ? '' : 'transition-all duration-200'}`}
                style={{ left: `${coordsHighlight.x - 14}px`, top: `${coordsHighlight.y - 14}px` }}
              >
                <span className="text-white font-extrabold text-[10px] font-mono">{coordsHighlight.val}</span>
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
                    value={String(tempHour)}
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

          {/* Footer Controls */}
          <div className="border-t border-border/60 pt-3 flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={() => setShowKeyboard((prev) => !prev)}
              className="btn-icon p-1.5 rounded-lg hover:bg-surface-hover hover:text-primary transition-all text-muted"
              title={showKeyboard ? 'Select via Clock face' : 'Select via Keyboard'}
            >
              {showKeyboard ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Keyboard className="w-4 h-4" />
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
