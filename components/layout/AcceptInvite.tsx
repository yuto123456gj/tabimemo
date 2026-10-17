'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { acceptInvite } from '@/lib/actions/groups';

export function AcceptInvite({ token, groupName }: { token: string; groupName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [pending, startTransition] = useTransition();

  const join = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvite(token);
      if (!result.ok) {
        setError(result.error ?? '参加できませんでした。');
        return;
      }
      setJoined(true);
      router.push('/places');
    });
  };

  if (joined) {
    return <Notice tone="success">「{groupName}」に参加しました。スポット一覧に移動します…</Notice>;
  }

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <Button onClick={join} disabled={pending} size="lg" className="w-full">
        {pending ? <Spinner /> : 'このグループに参加する'}
      </Button>
    </div>
  );
}
