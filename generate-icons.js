const fs = require("fs");
const zlib = require("zlib");

const palette = {
  bg: [9, 17, 31, 255],
  glow: [106, 226, 255, 255],
  warm: [255, 184, 77, 255],
  danger: [255, 107, 122, 255],
  green: [99, 240, 125, 255],
  purple: [207, 123, 255, 255],
  white: [235, 247, 255, 255],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPng(size, draw) {
  const rowLength = size * 4 + 1;
  const raw = Buffer.alloc(rowLength * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * rowLength] = 0;
  }

  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) {
      return;
    }
    const offset = y * rowLength + 1 + x * 4;
    raw[offset] = color[0];
    raw[offset + 1] = color[1];
    raw[offset + 2] = color[2];
    raw[offset + 3] = color[3];
  };

  draw(setPixel, size);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function blend(base, top, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + top[0] * alpha),
    Math.round(base[1] * (1 - alpha) + top[1] * alpha),
    Math.round(base[2] * (1 - alpha) + top[2] * alpha),
    255,
  ];
}

function drawIcon(setPixel, size) {
  const radius = size * 0.22;
  const margin = Math.round(size * 0.12);
  const block = Math.round(size * 0.11);
  const startX = Math.round(size * 0.24);
  const startY = Math.round(size * 0.25);
  const layout = [
    "1111",
    "1100",
    "0110",
    "0110",
    "0011",
    "1110",
  ];
  const accents = {
    "0,1": palette.warm,
    "1,2": palette.danger,
    "2,3": palette.green,
    "0,5": palette.purple,
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.max(Math.abs(x - size / 2) - (size / 2 - radius), 0);
      const dy = Math.max(Math.abs(y - size / 2) - (size / 2 - radius), 0);
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }

      let color = palette.bg;

      const glowDistance = Math.hypot(x - size * 0.28, y - size * 0.2);
      if (glowDistance < size * 0.6) {
        const alpha = (1 - glowDistance / (size * 0.6)) * 0.35;
        color = blend(color, palette.glow, alpha);
      }

      const warmDistance = Math.hypot(x - size * 0.82, y - size * 0.82);
      if (warmDistance < size * 0.42) {
        const alpha = (1 - warmDistance / (size * 0.42)) * 0.18;
        color = blend(color, palette.warm, alpha);
      }

      setPixel(x, y, color);
    }
  }

  for (let row = 0; row < layout.length; row += 1) {
    for (let col = 0; col < layout[row].length; col += 1) {
      if (layout[row][col] !== "1") {
        continue;
      }

      const mainColor = accents[`${col},${row}`] || palette.glow;
      const px = startX + col * block;
      const py = startY + row * block;

      for (let y = 0; y < block - 4; y += 1) {
        for (let x = 0; x < block - 4; x += 1) {
          const shade = x < block / 3 && y < block / 3 ? blend(mainColor, palette.white, 0.18) : mainColor;
          setPixel(px + x + 2, py + y + 2, shade);
        }
      }
    }
  }

  for (let y = margin; y < margin + Math.round(size * 0.035); y += 1) {
    for (let x = margin; x < size - margin; x += 1) {
      setPixel(x, y, palette.white);
    }
  }
}

const outputs = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [filename, size] of outputs) {
  fs.writeFileSync(filename, createPng(size, drawIcon));
}
