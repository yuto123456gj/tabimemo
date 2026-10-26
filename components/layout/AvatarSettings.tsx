'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconUpload } from '@/components/ui/Icons';
import { updateAvatar } from '@/lib/actions/groups';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

/** 選べる絵文字（旅っぽいものを中心に） */
const EMOJIS = [
  '😀', '😎', '🥳', '🐱', '🐶', '🐰', '🐻', '🦊',
  '🌸', '🌻', '🌊', '⛰️', '⛩️', '🗼', '✈️', '🚃',
  '☕️', '🍜', '🍣', '🍰', '🧳', '🗺️', '📷', '⭐️',
];

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarSettings({
  name,
  currentAvatar,
  userId,
}: {
  name: string | null;
  currentAvatar: string | null;
  userId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const apply = (value: string | null, successText: string) => {
    setError(null);
    setMessage(null);
    setPreview(value);
    startTransition(async () => {
      const result = await updateAvatar(value);
      if (!result.ok) {
        setError(result.error ?? '変更できませんでした。');
        setPreview(currentAvatar);
        return;
      }
      setMessage(successText);
      router.refresh();
    });
  };

  const upload = async (file: File) => {
    setError(null);
    setMessage(null);

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選んでください。');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('画像が大きすぎます（5MBまで）。');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `avatars/${userId}/${Date.now()}.${ext || 'jpg'}`;

      const { error: uploadError } = await supabase.storage
        .from('place-photos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError(`アップロードに失敗しました: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from('place-photos').getPublicUrl(path);
      apply(data.publicUrl, 'アイコンを変更しました');
    } catch {
      setError('アップロードに失敗しました。通信状況を確認してください。');
    } finally {
      setUploading(false);
    }
  };

  const busy = pending || uploading;

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <div className="flex items-center gap-4">
        <Avatar name={name} avatarUrl={preview} size={64} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {uploading ? <Spinner /> : <IconUpload width={16} height={16} />}
            写真を選ぶ
          </Button>
          {preview && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => apply(null, 'アイコンを頭文字に戻しました')}
            >
              元に戻す
            </Button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-600 dark:text-ink-300">絵文字から選ぶ</p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={busy}
              onClick={() => apply(emoji, 'アイコンを変更しました')}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl text-xl transition hover:scale-110',
                preview === emoji
                  ? 'bg-brand-500 ring-2 ring-brand-300'
                  : 'bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700',
              )}
              aria-label={`アイコンを ${emoji} にする`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-400">写真は正方形に切り取って表示されます（5MBまで）。</p>
    </div>
  );
}
