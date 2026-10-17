'use client';

import { cn } from '@/lib/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      role="status"
      aria-label="読み込み中"
    />
  );
}

export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'error' | 'success' | 'warn';
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-accent-50 text-accent-800 border-accent-200 dark:bg-accent-900/30 dark:text-accent-100 dark:border-accent-800',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    warn: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900',
  };
  return (
    <div className={cn('rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed', tones[tone], className)}>
      {children}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="skeleton h-32 w-full" />
      <div className="skeleton mt-3 h-4 w-2/3" />
      <div className="skeleton mt-2 h-3 w-1/3" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
