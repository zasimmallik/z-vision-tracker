import React from 'react';
import type { WeekendHighlight } from '../../types/vision';

interface CalendarProps {
  selectedMonth: Date;
  weekendHighlight?: WeekendHighlight;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedMonth,
  weekendHighlight = 'friday',
}) => {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      selectedMonth.getFullYear() === today.getFullYear() &&
      selectedMonth.getMonth() === today.getMonth() &&
      day === today.getDate()
    );
  };

  const isHighlightedWeekendDay = (day: number): boolean => {
    if (weekendHighlight === 'none') return false;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const dow = new Date(year, month, day).getDay();
    if (weekendHighlight === 'friday') return dow === 5;
    return dow === 0 || dow === 6;
  };

  const isHighlightedHeader = (dayLabel: string): boolean => {
    if (weekendHighlight === 'none') return false;
    if (weekendHighlight === 'friday') return dayLabel === 'Fri';
    return dayLabel === 'Sat' || dayLabel === 'Sun';
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedMonth);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const totalCells = startingDayOfWeek + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              isHighlightedHeader(day)
                ? 'text-[var(--semantic-negative)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: startingDayOfWeek }, (_, index) => (
          <div key={`empty-start-${index}`} className="h-11 sm:h-12" />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const isCurrentDay = isToday(day);
          const isWeekend = isHighlightedWeekendDay(day);

          return (
            <div
              key={day}
              className={`h-11 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-[15px] font-mono tabular-nums transition-[background-color,border-color,color] duration-150 ${
                isCurrentDay
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border border-[var(--accent-border)]'
                  : isWeekend
                    ? 'bg-[var(--semantic-negative-soft)] text-[var(--semantic-negative)] font-medium border border-[var(--semantic-negative-border)]'
                    : 'text-[var(--text-primary)] font-normal border border-transparent hover:bg-[var(--bg-raised)] hover:border-[var(--border-hairline)]'
              }`}
            >
              {day}
            </div>
          );
        })}

        {Array.from({ length: remainingCells }, (_, index) => (
          <div key={`empty-end-${index}`} className="h-11 sm:h-12" />
        ))}
      </div>
    </div>
  );
};

export default Calendar;
