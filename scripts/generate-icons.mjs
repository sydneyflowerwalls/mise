/**
 * Generate the PWA icons as real PNGs, with no image dependency.
 *
 * iOS will not accept an SVG for the home-screen icon, and "Add to Home
 * Screen" is load-bearing here: Safari evicts script-writable storage after
 * seven days without a visit, but installed web apps are exempt.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BLUSH = [0xff, 0xd1, 0xdc];
const LILAC = [0x9d, 0x84, 0xb6];
const CREAM = [0xff, 0xf9, 0xc4];

/** Four-pointed sparkle: the spec's motif, drawn as an astroid-ish curve. */
function sparkleAlpha(x, y, cx, cy, r) {
  const dx = Math.abs(x - cx) / r;
  const dy = Math.abs(y - cy) / r;
  if (dx > 1 || dy > 1) return 0;
  // |x|^0.5 + |y|^0.5 <= 1 gives the concave four-point star.
  const v = Math.sqrt(dx) + Math.sqrt(dy);
  if (v > 1) return 0;
  return Math.min(1, (1 - v) * 6);
}

function renderPng(size, { padded }) {
  const rows = [];
  const inset = padded ? size * 0.14 : 0;
  const radius = padded ? size * 0.22 : 0;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let [r, g, b] = BLUSH;
      let a = 255;

      if (padded) {
        // Rounded-square mask, generous corners per the design system.
        const px = Math.min(x - inset, size - inset - 1 - x);
        const py = Math.min(y - inset, size - inset - 1 - y);
        if (px < 0 || py < 0) {
          a = 0;
        } else if (px < radius && py < radius) {
          const d = Math.hypot(radius - px, radius - py);
          if (d > radius) a = 0;
          else if (d > radius - 1.5) a = Math.round(255 * (radius - d) / 1.5);
        }
      }

      if (a > 0) {
        // Soft vertical wash from blush into cream.
        const t = y / size;
        r = Math.round(BLUSH[0] * (1 - t) + CREAM[0] * t);
        g = Math.round(BLUSH[1] * (1 - t) + CREAM[1] * t);
        b = Math.round(BLUSH[2] * (1 - t) + CREAM[2] * t);

        const big = sparkleAlpha(x, y, size * 0.5, size * 0.47, size * 0.3);
        const small = sparkleAlpha(x, y, size * 0.73, size * 0.26, size * 0.11);
        const k = Math.max(big, small);
        if (k > 0) {
          r = Math.round(r * (1 - k) + LILAC[0] * k);
          g = Math.round(g * (1 - k) + LILAC[1] * k);
          b = Math.round(b * (1 - k) + LILAC[2] * k);
        }
      }

      const o = 1 + x * 4;
      row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = a;
    }
    rows.push(row);
  }

  return encodePng(size, size, Buffer.concat(rows));
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function encodePng(width, height, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  ["public/icon-192.png", 192, { padded: false }],
  ["public/icon-512.png", 512, { padded: false }],
  ["public/icon-maskable-512.png", 512, { padded: false }],
  ["public/apple-touch-icon.png", 180, { padded: false }],
  ["public/favicon-32.png", 32, { padded: false }],
];

for (const [path, size, opts] of targets) {
  writeFileSync(path, renderPng(size, opts));
  console.log(`wrote ${path} (${size}x${size})`);
}
