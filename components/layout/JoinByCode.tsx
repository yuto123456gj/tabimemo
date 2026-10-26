'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconUsers } from '@/components/ui/Icons';
import { joinByCode } from '@/lib/actions/groups';

/** 合言葉を入力してグループに参加するフォーム */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cleaned = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  const join = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await joinByCode(code);
      if (!result.ok) {
        setError(result.error ?? '参加できませんでした。');
        return;
      }
      const data = result.data!;
      setMessage(
        data.alreadyMember
          ? `「${data.groupName}」にはすでに参加しています。`
          : `「${data.groupName}」に参加しました！`,
      );
      setCode('');
      router.refresh();
    });
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <IconUsers className="text-accent-500" />
        <h2 className="text-sm font-bold text-ink-900 dark:text-ink-50">合言葉でグループに参加する</h2>
      </div>
      <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
        相手から教えてもらった8文字の合言葉を入れてください。小文字やハイフンのままでも大丈夫です。
      </p>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <div className="flex gap-2">
        <input
          className="input text-center font-mono text-lg tracking-[0.3em] uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD2345"
          maxLength={12}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="合言葉"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && cleaned.length === 8) {
              e.preventDefault();
              join();
            }
          }}
        />
        <Button onClick={join} disabled={pending || cleaned.length !== 8}>
          {pending ? <Spinner /> : '参加'}
        </Button>
      </div>
      {code.length > 0 && cleaned.length !== 8 && (
        <p className="text-xs text-ink-400">あと {Math.max(0, 8 - cleaned.length)} 文字（現在 {cleaned.length} 文字）</p>
      )}
    </div>
  );
}
