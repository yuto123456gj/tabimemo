'use client';

import { useState } from 'react';
import { IconStar } from './Icons';
import { cn } from '@/lib/utils/cn';

export function StarRating({
  value,
  onChange,
  size = 22,
  readOnly = false,
  className,
}: {
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`評価 ${value ?? 0} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        const inner = (
          <IconStar
            filled={filled}
            width={size}
            height={size}
            className={filled ? 'text-amber-400' : 'text-ink-300 dark:text-ink-600'}
          />
        );
        if (readOnly) return <span key={n}>{inner}</span>;
        return (
          <button
            key={n}
            type="button"
            className="rounded-md p-0.5 transition hover:scale-110"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange?.(n)}
            aria-label={`${n}つ星`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
