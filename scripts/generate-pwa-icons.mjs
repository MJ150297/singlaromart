#!/usr/bin/env node
/**
 * Generates PWA icons for Indiyano using pure Node.js (no external deps).
 * Creates:
 *   - public/icon-192x192.png
 *   - public/icon-512x512.png
 *   - src/app/apple-icon.png (180x180)
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ─── PNG encoder (minimal) ────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * @param {number} size
 * @param {(pixels: Uint8ClampedArray, size: number) => void} draw
 * @returns {Buffer}
 */
function encodePng(size, draw) {
  const pixels = new Uint8ClampedArray(size * size * 4);
  draw(pixels, size);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      const dstIdx = rowStart + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ──────────────────────────────────────────────────────
function roundRect(pixels, size, cx, cy, halfW, halfH, radius, r, g, b, a) {
  const minX = Math.floor(cx - halfW);
  const maxX = Math.ceil(cx + halfW);
  const minY = Math.floor(cy - halfH);
  const maxY = Math.ceil(cy + halfH);

  for (let y = Math.max(0, minY); y < Math.min(size, maxY); y++) {
    for (let x = Math.max(0, minX); x < Math.min(size, maxX); x++) {
      // Distance to nearest edge for rounded corners
      const dx = Math.max(minX + radius - x, 0, x - (maxX - 1 - radius));
      const dy = Math.max(minY + radius - y, 0, y - (maxY - 1 - radius));
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * size + x) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = a;
      }
    }
  }
}

function fillCircle(pixels, size, cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);

  for (let y = Math.max(0, minY); y < Math.min(size, maxY); y++) {
    for (let x = Math.max(0, minX); x < Math.min(size, maxX); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const idx = (y * size + x) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = a;
      }
    }
  }
}

/**
 * Draws the Indiyano icon:
 * - Emerald (#059669) circle background
 * - White "I" letterform
 */
function drawIndiyanoIcon(pixels, size) {
  const cx = size / 2;
  const cy = size / 2;

  // Background: emerald-600 #059669
  fillCircle(pixels, size, cx, cy, size * 0.5, 5, 150, 105, 255);

  // White "I" letterform made of 3 rectangles
  const barWidth = size * 0.46;
  const barHeight = size * 0.1;
  const stemWidth = size * 0.14;
  const stemHeight = size * 0.52;
  const barRadius = size * 0.03;

  // Top bar
  roundRect(pixels, size, cx, cy - stemHeight / 2 - barHeight / 2, barWidth / 2, barHeight / 2, barRadius, 255, 255, 255, 255);
  // Bottom bar
  roundRect(pixels, size, cx, cy + stemHeight / 2 + barHeight / 2, barWidth / 2, barHeight / 2, barRadius, 255, 255, 255, 255);
  // Stem
  roundRect(pixels, size, cx, cy, stemWidth / 2, stemHeight / 2, size * 0.02, 255, 255, 255, 255);
}

// ─── Generate icons ───────────────────────────────────────────────────────
const outputs = [
  { path: join(root, "public", "icon-192x192.png"), size: 192 },
  { path: join(root, "public", "icon-512x512.png"), size: 512 },
  { path: join(root, "src", "app", "apple-icon.png"), size: 180 },
];

for (const { path, size } of outputs) {
  mkdirSync(dirname(path), { recursive: true });
  const png = encodePng(size, drawIndiyanoIcon);
  writeFileSync(path, png);
  console.log(`✓ Generated ${path} (${size}x${size}, ${png.length} bytes)`);
}

console.log("All PWA icons generated successfully.");