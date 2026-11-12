import { categoryHue } from '@/lib/utils/category';
import { cn } from '@/lib/utils/cn';

/**
 * 写真が無いスポットの代わりに出す下地。
 * カテゴリごとの淡い色の上に、小さな丸アイコンを1つ置くだけにする
 * （絵文字をそのまま大きく出すと、一覧が絵文字だらけになって読みにくいため）。
 */
export function CategoryArt({
  emoji,
  category,
  size = 'md',
  className,
}: {
  emoji: string;
  /** 色を決めるのに使う（places.category の値） */
  category: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const circle = {
    sm: 'h-8 w-8 text-base',
    md: 'h-11 w-11 text-xl',
    lg: 'h-16 w-16 text-3xl',
  }[size];

  return (
    <div
      className={cn('cat-tint flex h-full w-full items-center justify-center', className)}
      style={{ '--cat-h': String(categoryHue(category)) } as React.CSSProperties}
    >
      <span
        className={cn(
          'grid place-items-center rounded-full bg-white/80 shadow-sm dark:bg-ink-900/70',
          circle,
        )}
        aria-hidden="true"
      >
        {emoji}
      </span>
    </div>
  );
}
