import { cn } from '@/lib/utils/cn';

/**
 * アカウントのアイコン。
 * avatar_url には「画像のURL」か「絵文字1文字」のどちらかが入る。
 * どちらも無ければ表示名の頭文字を出す。
 */
export function Avatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const label = (name ?? 'たびびと').trim();
  const isImage = Boolean(avatarUrl && /^https?:\/\//.test(avatarUrl));
  const isEmoji = Boolean(avatarUrl && !isImage && avatarUrl.length <= 8);

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient font-extrabold text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {isImage ? (
        // 画像のURLは外部ドメインになり得るので next/image ではなく img を使う
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl as string} alt="" className="h-full w-full object-cover" />
      ) : isEmoji ? (
        <span style={{ fontSize: size * 0.55 }}>{avatarUrl}</span>
      ) : (
        label.slice(0, 1)
      )}
    </span>
  );
}
