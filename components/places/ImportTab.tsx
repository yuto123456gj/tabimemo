'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconUpload } from '@/components/ui/Icons';
import { categoryMeta } from '@/lib/constants';
import { importPlaces, type ImportRow } from '@/lib/actions/places';
import { cn } from '@/lib/utils/cn';

interface ImportResponse {
  format: string;
  total: number;
  truncated: boolean;
  rows: ImportRow[];
  unresolved: string[];
  skipped: number;
  error?: string;
}

export function ImportTab({ groupId }: { groupId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = async (file: File) => {
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import/takeout', { method: 'POST', body: formData });
      const json = (await res.json()) as ImportResponse;
      if (!res.ok) {
        setError(json.error ?? '読み込みに失敗しました。');
        setPreview(null);
        return;
      }
      setPreview(json);
      setSelected(new Set(json.rows.map((_, i) => i)));
    } catch {
      setError('読み込みに失敗しました。ファイル形式を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const runImport = () => {
    if (!preview) return;
    const rows = preview.rows.filter((_, i) => selected.has(i));
    if (rows.length === 0) {
      setError('取り込む場所を選んでください。');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await importPlaces(groupId, rows);
      if (!result.ok) {
        setError(result.error ?? '取り込みに失敗しました。');
        return;
      }
      setDone(result.data ?? { imported: 0, skipped: 0 });
      setPreview(null);
      router.refresh();
    });
  };

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="card bg-sky-gradient p-4 dark:bg-ink-900">
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Googleマップの保存場所を取り込む</h3>
        <ol className="mt-2 space-y-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
          <li>
            1. <a href="https://takeout.google.com/" target="_blank" rel="noreferrer" className="underline">Google Takeout</a>
            で「マップ（マイプレイス）」または「保存済み」を選んで書き出す
          </li>
          <li>2. ダウンロードしたZIPを展開し、中の .json（GeoJSON）か .csv を選ぶ</li>
          <li>3. 下のボタンでアップロードすると、取り込む場所を選べます</li>
        </ol>
        <p className="mt-2 text-[11px] text-ink-500 dark:text-ink-400">
          すでに登録済みの場所（名前が似ていて50m以内）は、重複登録されません。
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.geojson,.csv,text/csv,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <Button onClick={() => fileRef.current?.click()} disabled={loading} className="w-full">
        {loading ? <Spinner /> : <IconUpload width={18} height={18} />}
        ファイルを選ぶ（GeoJSON / CSV）
      </Button>

      {error && <Notice tone="error">{error}</Notice>}

      {done && (
        <Notice tone="success">
          {done.imported}件を取り込みました。
          {done.skipped > 0 && `（重複・座標なしで ${done.skipped}件はスキップ）`}
          <Link href="/places" className="ml-1 font-bold underline">
            スポット一覧を見る
          </Link>
        </Notice>
      )}

      {preview && (
        <div className="space-y-3">
          <Notice tone="info">
            {preview.total}件のうち {preview.rows.length}件が取り込めます。
            {preview.unresolved.length > 0 && (
              <span className="mt-1 block text-xs">
                座標が分からなかった {preview.unresolved.length}件はスキップされます
                （{preview.unresolved.slice(0, 3).join('、')}
                {preview.unresolved.length > 3 && ' ほか'}）。「検索」タブから手動で追加できます。
              </span>
            )}
            {preview.truncated && <span className="mt-1 block text-xs">※ 一度に取り込めるのは300件までです。</span>}
          </Notice>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{selected.size}件を選択中</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="chip"
                onClick={() => setSelected(new Set(preview.rows.map((_, i) => i)))}
              >
                全選択
              </button>
              <button type="button" className="chip" onClick={() => setSelected(new Set())}>
                全解除
              </button>
            </div>
          </div>

          <ul className="max-h-80 space-y-1.5 overflow-y-auto rounded-card border border-ink-100 p-2 dark:border-ink-800">
            {preview.rows.map((row, i) => (
              <li key={`${row.name}-${i}`}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                    selected.has(i) ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-ink-50 dark:hover:bg-ink-800',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold',
                      selected.has(i)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-ink-300 text-transparent dark:border-ink-600',
                    )}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="shrink-0">{categoryMeta(row.category).emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900 dark:text-ink-50">{row.name}</span>
                    {row.address && (
                      <span className="block truncate text-[11px] text-ink-500 dark:text-ink-400">{row.address}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <Button onClick={runImport} disabled={pending || selected.size === 0} className="w-full">
            {pending ? <Spinner /> : `${selected.size}件を取り込む`}
          </Button>
        </div>
      )}
    </div>
  );
}
