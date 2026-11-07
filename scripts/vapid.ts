/**
 * 通知用のキー（VAPID）を作る。
 *
 *   npm run vapid
 *
 * 表示された2行を .env.local に貼り、Vercel にも同じ値を登録する。
 * 一度作ったら変えないこと（変えると、全員の「通知ON」をやり直すことになる）。
 */
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('以下を .env.local に貼り付けてください（Vercelにも同じ値を登録します）:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:あなたのメールアドレス');
console.log('\n※ VAPID_PRIVATE_KEY は秘密です。GitHubには絶対に入れないでください。');
