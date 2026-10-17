'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconLink, IconPlus, IconTrash, IconUsers } from '@/components/ui/Icons';
import { createGroup, createInvite, leaveGroup, removeMember, renameGroup, revokeInvite, switchGroup } from '@/lib/actions/groups';
import { formatJaDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { GroupWithRole } from '@/lib/data/session';
import type { GroupInvite } from '@/types/database';

export interface GroupDetail {
  group: GroupWithRole;
  members: Array<{ user_id: string; role: string; display_name: string; avatar_url: string | null }>;
  invites: GroupInvite[];
}

export function GroupManager({
  details,
  activeGroupId,
  currentUserId,
  siteUrl,
}: {
  details: GroupDetail[];
  activeGroupId: string | null;
  currentUserId: string | null;
  siteUrl: string;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? '処理できませんでした。');
        return;
      }
      if (success) setMessage(success);
      router.refresh();
    });
  };

  const inviteUrl = (token: string) => `${siteUrl}/invite/${token}`;

  const copy = async (token: string) => {
    const url = inviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(`コピーできませんでした。このURLを手動でコピーしてください: ${url}`);
    }
  };

  const share = async (token: string, groupName: string) => {
    const url = inviteUrl(token);
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: `${groupName} に招待`, text: '一緒に行きたい場所を貯めよう', url });
        return;
      } catch {
        // キャンセルされた場合はコピーにフォールバック
      }
    }
    await copy(token);
  };

  return (
    <div className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      {/* 新規作成 */}
      <Card>
        <h2 className="text-sm font-bold text-ink-900 dark:text-ink-50">新しいグループを作る</h2>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          「二人の行きたい場所」「友達と行く居酒屋」など、目的ごとに分けられます。
        </p>
        <form
          className="mt-3 flex gap-2"
          action={(formData) =>
            run(async () => {
              const result = await createGroup(formData);
              if (result.ok) setNewName('');
              return result;
            }, 'グループを作りました')
          }
        >
          <input
            name="name"
            className="input"
            placeholder="二人の行きたい場所"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Button type="submit" disabled={pending || !newName.trim()}>
            {pending ? <Spinner /> : <IconPlus width={18} height={18} />}
            作る
          </Button>
        </form>
      </Card>

      {/* グループ一覧 */}
      {details.map(({ group, members, invites }) => {
        const isOwner = group.role === 'owner';
        const isActive = group.id === activeGroupId;
        const liveInvites = invites.filter(
          (i) => !i.revoked && (!i.expires_at || new Date(i.expires_at) > new Date()),
        );

        return (
          <Card key={group.id} className={cn(isActive && 'ring-2 ring-brand-300 dark:ring-brand-700')}>
            <div className="flex flex-wrap items-center gap-2">
              <IconUsers className="text-accent-500" />
              <h2 className="flex-1 text-base font-bold text-ink-900 dark:text-ink-50">{group.name}</h2>
              {isActive ? (
                <Badge tone="brand">表示中</Badge>
              ) : (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => switchGroup(group.id))}>
                  このグループを表示
                </Button>
              )}
            </div>

            <p className="mt-1 text-xs text-ink-400">
              {group.member_count}人・{isOwner ? 'オーナー' : 'メンバー'}・作成 {formatJaDate(group.created_at)}
            </p>

            {isOwner && (
              <form
                className="mt-3 flex gap-2"
                action={(formData) =>
                  run(() => renameGroup(group.id, String(formData.get('name') ?? '')), '名前を変更しました')
                }
              >
                <input name="name" className="input" defaultValue={group.name} aria-label="グループ名" />
                <Button type="submit" variant="outline" size="sm" disabled={pending}>
                  名前を変更
                </Button>
              </form>
            )}

            {/* メンバー */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">メンバー</h3>
              <ul className="mt-2 space-y-1.5">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                      {(m.display_name ?? 'M').slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {m.display_name}
                      {m.user_id === currentUserId && <span className="ml-1 text-xs text-ink-400">（自分）</span>}
                    </span>
                    {m.role === 'owner' && <Badge tone="muted">オーナー</Badge>}
                    {isOwner && m.user_id !== currentUserId && (
                      <button
                        type="button"
                        className="rounded-md p-1 text-ink-400 transition hover:text-red-500"
                        aria-label={`${m.display_name} を外す`}
                        disabled={pending}
                        onClick={() => run(() => removeMember(group.id, m.user_id), 'メンバーを外しました')}
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* 招待リンク */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">招待リンク</h3>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => createInvite(group.id, 14), '招待リンクを作りました（14日間有効）')}
                >
                  <IconLink width={16} height={16} />
                  発行する
                </Button>
              </div>

              {liveInvites.length === 0 ? (
                <p className="mt-2 text-xs text-ink-400">
                  有効な招待リンクはありません。「発行する」を押すと、14日間使えるリンクができます。
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {liveInvites.map((invite) => (
                    <li key={invite.id} className="rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800">
                      <p className="break-all font-mono text-[11px] text-ink-500 dark:text-ink-400">
                        {inviteUrl(invite.token)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => share(invite.token, group.name)}>
                          {copied === invite.token ? 'コピーしました' : '共有する'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copy(invite.token)}>
                          URLをコピー
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          disabled={pending}
                          onClick={() => run(() => revokeInvite(invite.id), '招待リンクを無効化しました')}
                        >
                          無効にする
                        </Button>
                        {invite.expires_at && (
                          <span className="text-[11px] text-ink-400">
                            {formatJaDate(invite.expires_at)}まで
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {details.length > 1 && (
              <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  disabled={pending}
                  onClick={() => run(() => leaveGroup(group.id), 'グループから抜けました')}
                >
                  このグループから抜ける
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
