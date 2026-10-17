import { cn } from '@/lib/utils/cn';

/** 空状態のイラスト（オリジナル。線画＋ブランドカラー） */
type Art = 'pin' | 'trip' | 'map' | 'group' | 'search';

function Illustration({ art }: { art: Art }) {
  const common = {
    width: 132,
    height: 104,
    viewBox: '0 0 132 104',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  const stroke = 'stroke-brand-400 dark:stroke-brand-500';
  const accent = 'stroke-accent-400 dark:stroke-accent-500';
  const fill = 'fill-brand-100 dark:fill-brand-900/40';

  if (art === 'trip') {
    return (
      <svg {...common}>
        <rect x="26" y="34" width="80" height="52" rx="10" className={cn(fill, stroke)} strokeWidth="2" />
        <path d="M26 50h80" className={stroke} strokeWidth="2" />
        <path d="M52 34V24a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v10" className={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M60 66h12M60 74h22" className={accent} strokeWidth="2" strokeLinecap="round" />
        <circle cx="46" cy="70" r="5" className={accent} strokeWidth="2" />
      </svg>
    );
  }
  if (art === 'map') {
    return (
      <svg {...common}>
        <path d="M30 28 52 22l28 8 22-6v56l-22 6-28-8-22 6V28Z" className={cn(fill, stroke)} strokeWidth="2" />
        <path d="M52 22v56M80 30v56" className={stroke} strokeWidth="2" strokeDasharray="4 5" />
        <path d="M66 44c-5 0-9 4-9 9s9 17 9 17 9-12 9-17-4-9-9-9Z" className={accent} strokeWidth="2" />
      </svg>
    );
  }
  if (art === 'group') {
    return (
      <svg {...common}>
        <circle cx="52" cy="40" r="12" className={cn(fill, stroke)} strokeWidth="2" />
        <circle cx="84" cy="46" r="9" className={accent} strokeWidth="2" />
        <path d="M30 84a22 22 0 0 1 44 0" className={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M78 84a16 16 0 0 1 24-11" className={accent} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (art === 'search') {
    return (
      <svg {...common}>
        <circle cx="58" cy="48" r="22" className={cn(fill, stroke)} strokeWidth="2" />
        <path d="m76 66 18 18" className={stroke} strokeWidth="3" strokeLinecap="round" />
        <path d="M48 48h20M58 38v20" className={accent} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M66 20c-12 0-21 9-21 21 0 15 21 42 21 42s21-27 21-42c0-12-9-21-21-21Z" className={cn(fill, stroke)} strokeWidth="2" />
      <circle cx="66" cy="40" r="7" className={accent} strokeWidth="2" />
      <path d="M24 92h84" className={stroke} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 6" />
    </svg>
  );
}

export function EmptyState({
  art = 'pin',
  title,
  description,
  action,
  className,
}: {
  art?: Art;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-ink-200 bg-white/60 px-6 py-10 text-center dark:border-ink-700 dark:bg-ink-900/50',
        className,
      )}
    >
      <Illustration art={art} />
      <h3 className="mt-3 text-base font-bold text-ink-800 dark:text-ink-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
