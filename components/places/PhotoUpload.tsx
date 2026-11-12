'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconTrash, IconUpload } from '@/components/ui/Icons';
import { updatePlace } from '@/lib/actions/places';
import { createClient } from '@/lib/supabase/client';

/** 受け取る元ファイルの上限。これを超えるものは縮小前に断る */
const MAX_BYTES = 15 * 1024 * 1024;
/** 保存する写真の長辺（スマホの写真をそのまま置くと重すぎるため縮める） */
const MAX_EDGE = 1600;

/**
 * 写真を縮めて JPEG にする。
 * 失敗したら元のファイルをそのまま返す（縮小は「できれば」の処理）。
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** スポットの写真を追加・変更・削除する */
export function PhotoUpload({
  placeId,
  hasPhoto,
  compact = false,
}: {
  placeId: string;
  hasPhoto: boolean;
  /** 写真の上に重ねて出す（小さいボタンにする） */
  compact?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const busy = uploading || pending;

  const upload = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選んでください。');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('画像が大きすぎます（15MBまで）。');
      return;
    }

    setUploading(true);
    try {
      const body = await shrink(file);
      const supabase = createClient();
      const path = `places/${placeId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('place-photos')
        .upload(path, body, { upsert: true, contentType: body.type || 'image/jpeg' });

      if (uploadError) {
        setError(`アップロードに失敗しました: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from('place-photos').getPublicUrl(path);
      const result = await updatePlace(placeId, { photo_url: data.publicUrl });
      if (!result.ok) {
        setError(result.error ?? '写真を保存できませんでした。');
        return;
      }
      router.refresh();
    } catch {
      setError('アップロードに失敗しました。通信状況を確認してください。');
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePlace(placeId, { photo_url: null });
      if (!result.ok) {
        setError(result.error ?? '写真を消せませんでした。');
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className={compact ? '' : 'space-y-2'}>
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant={compact ? 'primary' : 'outline'}
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {uploading ? <Spinner /> : <IconUpload width={16} height={16} />}
          {hasPhoto ? '写真を変える' : '写真を追加'}
        </Button>

        {hasPhoto && (
          <Button variant={compact ? 'outline' : 'ghost'} size="sm" onClick={remove} disabled={busy}>
            <IconTrash width={16} height={16} />
            写真を消す
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
