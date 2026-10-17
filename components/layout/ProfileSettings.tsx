'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { updateDisplayName } from '@/lib/actions/groups';

export function ProfileSettings({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (!result.ok) {
        setError(result.error ?? '保存できませんでした。');
        return;
      }
      setMessage('表示名を変更しました');
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <div>
        <label className="label" htmlFor="display-name">
          表示名（グループのメンバーに見える名前）
        </label>
        <div className="flex gap-2">
          <input id="display-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? <Spinner /> : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
