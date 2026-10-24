import Link from 'next/link';
import { IconChevronRight } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

/** 設定画面の「1行」。リンク行・表示のみの行・操作を置く行の3通りに使える。 */
export function SettingsGroup({
  title,
  children,
  footer,
}: {
  title?: string;
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      )}
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">{children}</ul>
      </div>
      {footer && <p className="mt-1.5 px-1 text-xs leading-relaxed text-ink-400">{footer}</p>}
    </section>
  );
}

interface BaseRowProps {
  icon?: React.ReactNode;
  label: string;
  /** 右側に出す補足（件数・現在値など） */
  value?: React.ReactNode;
  description?: string;
}

/** タップして別画面へ行く行 */
export function SettingsLinkRow({
  href,
  icon,
  label,
  value,
  description,
  external,
}: BaseRowProps & { href: string; external?: boolean }) {
  const inner = (
    <>
      <RowBody icon={icon} label={label} value={value} description={description} />
      <IconChevronRight width={18} height={18} className="shrink-0 text-ink-300 dark:text-ink-600" />
    </>
  );

  const className =
    'flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-ink-50 dark:hover:bg-ink-800';

  if (external) {
    return (
      <li>
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {inner}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={className}>
        {inner}
      </Link>
    </li>
  );
}

/** 表示するだけの行（右側に値を出す） */
export function SettingsInfoRow({ icon, label, value, description }: BaseRowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <RowBody icon={icon} label={label} value={value} description={description} />
    </li>
  );
}

/** 右側に任意の操作（トグル・ボタン）を置く行 */
export function SettingsActionRow({
  icon,
  label,
  description,
  action,
}: BaseRowProps & { action: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <RowBody icon={icon} label={label} description={description} />
      <div className="shrink-0">{action}</div>
    </li>
  );
}

function RowBody({ icon, label, value, description }: BaseRowProps) {
  return (
    <>
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink-900 dark:text-ink-50">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500 dark:text-ink-400">{description}</span>
        )}
      </span>
      {value !== undefined && (
        <span className={cn('shrink-0 text-sm text-ink-500 dark:text-ink-400')}>{value}</span>
      )}
    </>
  );
}
