// Generates build/icon.ico — a navy tile with a teal Netscape-style "N".
// Pure Node (zlib only), so we need no image tooling.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const S = 256;
const px = Buffer.alloc(S * S * 4);

function set(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}
function rect(x0, y0, x1, y1, c) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c[0], c[1], c[2]);
}

// background: navy with a lighter inset (chunky 3D bevel vibe)
rect(0, 0, S, S, [0, 0, 51]);
rect(10, 10, S - 10, S - 10, [0, 0, 128]);

// teal "N"
const teal = [56, 176, 255];
rect(56, 48, 96, 208, teal);    // left stroke
rect(160, 48, 200, 208, teal);  // right stroke
for (let y = 48; y < 208; y++) { // diagonal
  const t = (y - 48) / 160;
  const cx = Math.round(76 + (180 - 76) * t);
  for (let x = cx - 22; x < cx + 22; x++) set(x, y, teal[0], teal[1], teal[2]);
}

// ---- PNG encode ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// filtered scanlines (filter byte 0 per row)
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, y * S * 4 + S * 4);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

// ---- ICO wrap (single 256x256 PNG entry) ----
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0; entry[1] = 0;          // 0 means 256
entry[2] = 0; entry[3] = 0;          // palette / reserved
entry.writeUInt16LE(1, 4);           // planes
entry.writeUInt16LE(32, 6);          // bpp
entry.writeUInt32LE(png.length, 8);  // size
entry.writeUInt32LE(22, 12);         // offset
const ico = Buffer.concat([header, entry, png]);

const out = path.join(__dirname, '..', 'build', 'icon.ico');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ico);
fs.writeFileSync(path.join(__dirname, '..', 'build', 'icon.png'), png);
console.log('Wrote ' + out + ' (' + ico.length + ' bytes) and icon.png');
