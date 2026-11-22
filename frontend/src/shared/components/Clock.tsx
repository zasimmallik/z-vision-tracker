import React, { useState, useEffect } from 'react';

interface ClockProps {
  currentDate?: Date;
}

const Clock: React.FC<ClockProps> = ({ currentDate: initialDate }) => {
  const [date, setDate] = useState<Date>(() => initialDate || new Date());

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
      return;
    }
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [initialDate]);

  const rawTime = date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const [hms, period] = rawTime.split(' ');
  const [hours, minutes, seconds] = hms.split(':');

  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full flex flex-col items-center justify-center text-center gap-3">
      <div className="inline-flex items-baseline justify-center font-mono tabular-nums leading-none whitespace-nowrap">
        <span className="text-[clamp(2.6rem,10vw,4rem)] lg:text-[clamp(2.8rem,4.4vw,3.85rem)] font-medium tracking-[-0.03em] text-[var(--text-primary)]">
          {hours}:{minutes}
        </span>
        <span className="text-[clamp(1.25rem,4.2vw,1.85rem)] lg:text-[clamp(1.35rem,2.1vw,1.75rem)] font-normal tracking-[-0.01em] text-[var(--text-muted)] ml-1">
          :{seconds}
        </span>
        {period && (
          <span className="text-sm sm:text-base font-medium text-[var(--text-secondary)] ml-2">
            {period}
          </span>
        )}
      </div>

      <div className="text-sm sm:text-[15px] text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">{weekday}</span>
        <span className="mx-2 text-[var(--text-muted)]">·</span>
        <span>{fullDate}</span>
      </div>
    </div>
  );
};

export default React.memo(Clock);
