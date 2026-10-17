'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          fontFamily: "'Hiragino Sans', 'Noto Sans JP', system-ui, sans-serif",
          background: '#FFF3EE',
          color: '#2A2D34',
        }}
      >
        <div style={{ maxWidth: 380, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>問題が発生しました</h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.75 }}>
            予期しないエラーが起きました。お手数ですが、もう一度お試しください。
          </p>
          {error.digest && <p style={{ fontSize: 11, opacity: 0.6 }}>エラーID: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              border: 0,
              cursor: 'pointer',
              background: '#FF6134',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
