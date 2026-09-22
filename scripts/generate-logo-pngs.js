/**
 * 2026-09-07 공식 로고 PNG 생성 (파비콘·앱 아이콘·OG)
 * 브라우저 탭/홈화면에서 작은 크기로도 핀이 보이도록 채운 마커를 사용한다.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BLUE = [37, 99, 235, 255];
const WHITE = [255, 255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4;
      const p = pixels[y * width + x];
      raw[i] = p[0];
      raw[i + 1] = p[1];
      raw[i + 2] = p[2];
      raw[i + 3] = p[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function inRoundedRect(x, y, size, radius) {
  const r = radius;
  if (x >= r && x < size - r && y >= 0 && y < size) return true;
  if (y >= r && y < size - r && x >= 0 && x < size) return true;
  if (dist2(x, y, r, r) <= r * r) return true;
  if (dist2(x, y, size - r, r) <= r * r) return true;
  if (dist2(x, y, r, size - r) <= r * r) return true;
  if (dist2(x, y, size - r, size - r) <= r * r) return true;
  return false;
}

function inPin(x, y, cx, cy, scale) {
  const r = 8 * scale;
  const hole = 3 * scale;
  const tipX = cx;
  const tipY = cy + 11.8 * scale;
  const inHead = dist2(x, y, cx, cy) <= r * r;
  const inHole = dist2(x, y, cx, cy) <= hole * hole;
  const leftX = cx - 5.6 * scale;
  const rightX = cx + 5.6 * scale;
  const baseY = cy + 4.2 * scale;
  const v0x = leftX - tipX;
  const v0y = baseY - tipY;
  const v1x = rightX - tipX;
  const v1y = baseY - tipY;
  const v2x = x - tipX;
  const v2y = y - tipY;
  const den = v0x * v1y - v1x * v0y;
  const a = (v2x * v1y - v1x * v2y) / den;
  const b = (v0x * v2y - v2x * v0y) / den;
  const inTail = a >= 0 && b >= 0 && a + b <= 1;
  const stroke = 2.15 * scale;
  const outline =
    Math.abs(Math.hypot(x - cx, y - cy) - r) <= stroke * 0.55 ||
    distToSegment(x, y, cx - r * 0.72, cy + r * 0.62, tipX, tipY) <= stroke * 0.7 ||
    distToSegment(x, y, cx + r * 0.72, cy + r * 0.62, tipX, tipY) <= stroke * 0.7 ||
    Math.abs(Math.hypot(x - cx, y - cy) - hole) <= stroke * 0.5;
  return outline || ((inHead || inTail) && !inHole);
}

function paintMark(size, { rounded = true, fullBleed = false } = {}) {
  const pixels = new Array(size * size);
  const radius = size * 0.28;
  const cx = size / 2;
  const cy = size * 0.42;
  const scale = size / 32;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const insideBg = fullBleed
        ? true
        : rounded
          ? inRoundedRect(x + 0.5, y + 0.5, size, radius)
          : true;
      if (!insideBg) {
        pixels[y * size + x] = [0, 0, 0, 0];
        continue;
      }
      pixels[y * size + x] = inPin(x + 0.5, y + 0.5, cx, cy, scale)
        ? WHITE
        : BLUE;
    }
  }
  return pixels;
}

function writePng(file, width, height, pixels) {
  fs.writeFileSync(file, encodePng(width, height, pixels));
}

const outDir = path.join(__dirname, '..', 'client', 'public');
fs.mkdirSync(outDir, { recursive: true });

writePng(path.join(outDir, 'favicon-32x32.png'), 32, 32, paintMark(32, { rounded: true }));
writePng(path.join(outDir, 'apple-touch-icon.png'), 180, 180, paintMark(180, { fullBleed: true }));
writePng(path.join(outDir, 'icon-512.png'), 512, 512, paintMark(512, { rounded: true }));

console.log('logo pngs written to', outDir);
