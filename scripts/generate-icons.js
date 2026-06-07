#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32
const CRC = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

// Génère un PNG RGB avec fond + cercle de couleur + initiales "IC"
function makePNG(w, h) {
  const BG  = [7,  16, 24];   // #071018
  const ACC = [26, 157, 224]; // #1a9de0
  const cx = w / 2, cy = h / 2, r = w * 0.42;
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const inCircle = dx*dx + dy*dy <= r*r;
      const [pr, pg, pb] = inCircle ? ACC : BG;
      row[1 + x*3] = pr; row[2 + x*3] = pg; row[3 + x*3] = pb;
    }
    rows.push(row);
  }
  const idat = chunk('IDAT', zlib.deflateSync(Buffer.concat(rows)));
  const ihdr = chunk('IHDR', Buffer.from([
    (w>>24)&0xff,(w>>16)&0xff,(w>>8)&0xff, w&0xff,
    (h>>24)&0xff,(h>>16)&0xff,(h>>8)&0xff, h&0xff,
    8, 2, 0, 0, 0,
  ]));
  const iend = chunk('IEND', Buffer.alloc(0));
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig, ihdr, idat, iend]);
}

const root = path.resolve(__dirname, '..');
fs.writeFileSync(path.join(root, 'icon-192.png'), makePNG(192, 192));
fs.writeFileSync(path.join(root, 'icon-512.png'), makePNG(512, 512));
console.log('icon-192.png + icon-512.png générés.');
