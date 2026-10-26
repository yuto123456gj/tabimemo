'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, Card } from '@/components/ui/Card';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconPlus, IconTrash, IconUsers } from '@/components/ui/Icons';
import {
  createGroup,
  deleteGroup,
  leaveGroup,
  removeMember,
  regenerateJoinCode,
  renameGroup,
  switchGroup,
} from '@/lib/actions/groups';
import { formatJaDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { GroupWithRole } from '@/lib/data/session';

export interface GroupDetail {
  group: GroupWithRole;
  members: Array<{ user_id: string; role: string; display_name: string; avatar_url: string | null }>;
}

export function GroupManager({
  details,
  activeGroupId,
  currentUserId,
}: {
  details: GroupDetail[];
  activeGroupId: string | null;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
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
      {details.map(({ group, members }) => {
        const isOwner = group.role === 'owner';
        const isActive = group.id === activeGroupId;

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
                    <Avatar name={m.display_name} avatarUrl={m.avatar_url} size={32} />
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

            {/* 合言葉 */}
            <div className="mt-4 rounded-xl bg-sky-gradient p-3 dark:bg-ink-800">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                合言葉
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
                この8文字を相手に伝えてください。相手はログイン後、「合言葉で参加する」に入力するだけです。
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="select-all rounded-lg bg-white px-3 py-2 font-mono text-xl font-bold tracking-[0.25em] text-brand-600 dark:bg-ink-900 dark:text-brand-300">
                  {group.join_code}
                </code>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(group.join_code)
                      .then(() => {
                        setCopied(group.join_code);
                        window.setTimeout(() => setCopied(null), 2000);
                      })
                      .catch(() => setError(`コピーできませんでした: ${group.join_code}`));
                  }}
                >
                  {copied === group.join_code ? 'コピーしました' : '合言葉をコピー'}
                </Button>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => regenerateJoinCode(group.id), '合言葉を作り直しました')}
                  >
                    作り直す
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              {members.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  disabled={pending}
                  onClick={() => run(() => leaveGroup(group.id), 'グループから抜けました')}
                >
                  このグループから抜ける
                </Button>
              )}

              {isOwner &&
                (confirmingDelete === group.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-red-600 dark:text-red-400">
                      「{group.name}」の中のスポットとしおりも、すべて消えます。戻せません。
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setConfirmingDelete(null);
                        run(() => deleteGroup(group.id), 'グループを削除しました');
                      }}
                    >
                      完全に削除する
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>
                      やめる
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    disabled={pending}
                    onClick={() => setConfirmingDelete(group.id)}
                  >
                    グループを削除
                  </Button>
                ))}

              {members.length === 1 && !isOwner && (
                <p className="text-xs text-ink-400">
                  あなたが最後のメンバーのため、抜けることはできません。
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
