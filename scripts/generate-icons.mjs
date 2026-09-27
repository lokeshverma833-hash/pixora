import fs from 'fs';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function generatePng(size, isMaskable = false) {
  const width = size;
  const height = size;

  // Raw image buffer with filter byte per scanline
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const cx = width / 2;
      const cy = height / 2;
      const dx = (x - cx) / (width / 2);
      const dy = (y - cy) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base Indigo gradient background (4F46E5 to 7C3AED)
      const grad = (x + y) / (width + height);
      let r = Math.round(79 + (124 - 79) * grad);
      let g = Math.round(70 + (58 - 70) * grad);
      let b = Math.round(229 + (237 - 229) * grad);
      let a = 255;

      // If not maskable, round corners
      if (!isMaskable) {
        const cornerRadius = 0.22;
        const cornerDistX = Math.max(0, Math.abs(dx) - (1 - cornerRadius));
        const cornerDistY = Math.max(0, Math.abs(dy) - (1 - cornerRadius));
        const cDist = Math.sqrt(cornerDistX * cornerDistX + cornerDistY * cornerDistY);
        if (cDist > cornerRadius) {
          a = 0;
        }
      }

      // Draw Center App Glyph (Camera / Picture frame emblem)
      const scale = isMaskable ? 0.35 : 0.42;
      if (Math.abs(dx) < scale && Math.abs(dy) < scale) {
        // Outer white border of frame
        const borderDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (borderDist > scale - 0.05) {
          r = 255; g = 255; b = 255;
        }
        // Sun/Spark circle
        const sunDx = dx - (scale * 0.45);
        const sunDy = dy - (-scale * 0.45);
        if (Math.sqrt(sunDx * sunDx + sunDy * sunDy) < 0.07) {
          r = 255; g = 215; b = 0;
        }
        // Mountain triangle
        if (dy > 0 && dy < scale - 0.05 && Math.abs(dx) < (scale - dy) * 0.9) {
          r = 240; g = 245; b = 255;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Header
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/icon-192.png', generatePng(192, false));
fs.writeFileSync('public/icon-512.png', generatePng(512, false));
fs.writeFileSync('public/icon-maskable-512.png', generatePng(512, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePng(180, false));

console.log('Generated PWA icon assets in public/');
