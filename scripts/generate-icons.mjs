/**
 * PWA用のアイコンPNGを生成する（外部依存なし / zlib だけ使う）。
 * 実行: node scripts/generate-icons.mjs
 *
 * ブランドのグラデーション背景に、白いマップピンを描く。
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BRAND = [0xff, 0x61, 0x34];
const WARM = [0xff, 0x9f, 0x5a];
const ACCENT = [0x13, 0xaa, 0xa1];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function gradientColor(t) {
  // 0 -> BRAND, 0.45 -> WARM, 1 -> ACCENT
  if (t < 0.45) {
    const k = t / 0.45;
    return [lerp(BRAND[0], WARM[0], k), lerp(BRAND[1], WARM[1], k), lerp(BRAND[2], WARM[2], k)];
  }
  const k = (t - 0.45) / 0.55;
  return [lerp(WARM[0], ACCENT[0], k), lerp(WARM[1], ACCENT[1], k), lerp(WARM[2], ACCENT[2], k)];
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // フィルタなし
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** ピンの形の内側かどうか（上の円 + 下に伸びる三角） */
function insidePin(x, y, size, scale) {
  const cx = size / 2;
  const headY = size * 0.42;
  const r = size * 0.21 * scale;
  const tipY = size * 0.80;

  // 頭の円
  if ((x - cx) ** 2 + (y - headY) ** 2 <= r ** 2) return true;

  // 先端に向かう三角
  if (y >= headY && y <= tipY) {
    const t = (y - headY) / (tipY - headY);
    const halfWidth = r * 0.88 * (1 - t);
    if (Math.abs(x - cx) <= halfWidth) return true;
  }
  return false;
}

function render(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  // maskable はセーフゾーン（中央80%）に収めるため図形を小さく描く
  const scale = maskable ? 0.78 : 1;
  const radius = maskable ? 0 : size * 0.22; // 角丸（maskableは全面塗り）

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;

      // 角丸の外側は透明
      if (radius > 0) {
        const dx = Math.max(radius - x, x - (size - radius), 0);
        const dy = Math.max(radius - y, y - (size - radius), 0);
        if (dx > 0 && dy > 0 && dx * dx + dy * dy > radius * radius) {
          rgba[i + 3] = 0;
          continue;
        }
      }

      const t = (x / size) * 0.5 + (y / size) * 0.5;
      const [r, g, b] = gradientColor(t);
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;

      // ピン（白）
      const px = maskable ? (x - size / 2) / scale + size / 2 : x;
      const py = maskable ? (y - size / 2) / scale + size / 2 : y;
      if (insidePin(px, py, size, 1)) {
        rgba[i] = 255;
        rgba[i + 1] = 255;
        rgba[i + 2] = 255;
      }

      // ピンの穴（背景色に戻す）
      const holeR = size * 0.075;
      const hx = px - size / 2;
      const hy = py - size * 0.42;
      if (hx * hx + hy * hy <= holeR * holeR) {
        rgba[i] = r;
        rgba[i + 1] = g;
        rgba[i + 2] = b;
      }
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const target of targets) {
  const png = render(target.size, { maskable: target.maskable });
  writeFileSync(join(outDir, target.file), png);
  console.log(`✓ ${target.file} (${png.length} bytes)`);
}
