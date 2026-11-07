'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from '@/lib/actions/notifications';
import { cn } from '@/lib/utils/cn';

/** VAPIDの公開鍵（base64url）を、ブラウザが要求する Uint8Array に変換する */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const current = new Uint8Array(a);
  if (current.length !== b.length) return false;
  return current.every((value, i) => value === b[i]);
}

/** iPhone/iPad は「ホーム画面に追加」した状態でないと通知を受け取れない */
function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type State =
  | { kind: 'checking' }
  /** この端末・ブラウザがプッシュ通知に対応していない */
  | { kind: 'unsupported' }
  /** iOSでホーム画面に追加されていない */
  | { kind: 'needs-install' }
  /** 開発サーバーでは Service Worker を登録していない */
  | { kind: 'dev' }
  /** ブラウザ側で通知が拒否されている（OSやブラウザの設定から戻す必要がある） */
  | { kind: 'blocked' }
  /** Service Worker の準備が終わらなかった（初回アクセス直後など） */
  | { kind: 'not-ready' }
  | { kind: 'off' }
  | { kind: 'on' };

/** Service Worker の登録を待つ。登録されないまま時間が経ったら null を返す。 */
async function waitForRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export function PushSettings({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>({ kind: 'checking' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const appKey = useCallback(() => urlBase64ToUint8Array(vapidPublicKey), [vapidPublicKey]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState({ kind: 'unsupported' });
        return;
      }
      if (isIos() && !isStandalone()) {
        setState({ kind: 'needs-install' });
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        setState({ kind: 'dev' });
        return;
      }
      if (Notification.permission === 'denied') {
        setState({ kind: 'blocked' });
        return;
      }

      const registration = await waitForRegistration();
      if (cancelled) return;
      if (!registration) {
        setState({ kind: 'not-ready' });
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (cancelled) return;
      setState({ kind: subscription ? 'on' : 'off' });
    };

    check().catch(() => {
      if (!cancelled) setState({ kind: 'unsupported' });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const turnOn = () => {
    setError(null);
    setMessage(null);

    // iOS では、ユーザーの操作の直後に requestPermission を呼ぶ必要がある（await を挟まない）
    const permission =
      Notification.permission === 'granted'
        ? Promise.resolve<NotificationPermission>('granted')
        : Notification.requestPermission();

    startTransition(async () => {
      try {
        const answer = await permission;
        if (answer === 'denied') {
          setState({ kind: 'blocked' });
          return;
        }
        if (answer !== 'granted') {
          // 許可ダイアログを閉じられただけ。OFFのままにして、もう一度押せるようにする
          setState({ kind: 'off' });
          setMessage('通知は許可されませんでした。もう一度ONを押すと確認が出ます');
          return;
        }

        const registration = await waitForRegistration();
        if (!registration) {
          setState({ kind: 'not-ready' });
          return;
        }

        const key = appKey();
        let subscription = await registration.pushManager.getSubscription();

        // 以前と違う鍵で購読していると送信できないので、作り直す
        if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
          subscription = null;
        }

        subscription ??= await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as BufferSource,
        });

        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
          userAgent: navigator.userAgent,
        });

        if (!result.ok) {
          setError(result.error ?? '通知をONにできませんでした。');
          return;
        }

        setState({ kind: 'on' });
        setMessage('この端末で通知を受け取ります');
      } catch (e) {
        setError(e instanceof Error ? e.message : '通知をONにできませんでした。');
      }
    });
  };

  const turnOff = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const registration = await waitForRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setState({ kind: 'off' });
        setMessage('この端末への通知を止めました');
      } catch (e) {
        setError(e instanceof Error ? e.message : '通知をOFFにできませんでした。');
      }
    });
  };

  const test = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNotification();
      if (!result.ok) {
        setError(result.error ?? 'テスト通知を送れませんでした。');
        return;
      }
      setMessage('テスト通知を送りました。数秒待っても届かない場合は、OFF→ONを試してください');
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900 dark:text-ink-50">スポット追加のお知らせ</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            {describe(state)}
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          {state.kind === 'checking' || pending ? (
            <span className="grid h-10 w-[70px] place-items-center">
              <Spinner className="text-ink-400" />
            </span>
          ) : state.kind === 'on' || state.kind === 'off' ? (
            <Switch on={state.kind === 'on'} onChange={state.kind === 'on' ? turnOff : turnOn} />
          ) : null}
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      {state.kind === 'needs-install' && (
        <Notice tone="info">
          iPhone・iPadでは、Safariの共有ボタン（□↑）から
          <strong className="mx-1">ホーム画面に追加</strong>
          して、そのアイコンから開くと通知を受け取れます。
        </Notice>
      )}

      {state.kind === 'blocked' && (
        <Notice tone="warn">
          ブラウザで通知が拒否されています。端末の「設定 → 通知」やブラウザのサイト設定から、このサイトの通知を許可してください。
        </Notice>
      )}

      {state.kind === 'on' && (
        <Button variant="outline" onClick={test} disabled={pending} className="w-full">
          テスト通知を送る
        </Button>
      )}
    </div>
  );
}

function describe(state: State): string {
  switch (state.kind) {
    case 'checking':
      return '確認中…';
    case 'unsupported':
      return 'この端末・ブラウザは通知に対応していません。';
    case 'needs-install':
      return 'ホーム画面に追加すると、通知を受け取れます。';
    case 'dev':
      return '開発サーバーでは通知は動きません（本番サイトで試してください）。';
    case 'blocked':
      return 'ブラウザで通知が拒否されています。';
    case 'not-ready':
      return '通知の準備が整いませんでした。ページを再読み込みしてください。';
    case 'on':
      return 'メンバーがスポットを追加すると、この端末に通知が届きます。';
    case 'off':
      return 'ONにすると、メンバーがスポットを追加したときに通知が届きます。';
  }
}

/** 設定画面用のスイッチ（ON/OFF） */
function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="スポット追加のお知らせ"
      onClick={onChange}
      className={cn(
        'relative h-7 w-12 rounded-pill transition',
        on ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
          on ? 'left-6' : 'left-1',
        )}
      />
    </button>
  );
}
