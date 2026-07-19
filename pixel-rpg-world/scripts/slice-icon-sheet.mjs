import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DEFAULT_MANIFEST, validateIconData } from "./validate-icons.mjs";

function parseHex(value) {
  return [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function removeKey(buffer, info, key) {
  const output = Buffer.from(buffer);
  for (let offset = 0; offset < output.length; offset += info.channels) {
    const distance = Math.max(
      Math.abs(output[offset] - key[0]),
      Math.abs(output[offset + 1] - key[1]),
      Math.abs(output[offset + 2] - key[2]),
    );
    if (distance <= 16) output[offset + 3] = 0;
    else if (distance < 64) output[offset + 3] = Math.round((distance - 16) / 48 * 255);
  }
  return output;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function sliceIconSheet(manifestPath = DEFAULT_MANIFEST) {
  const data = validateIconData(JSON.parse(await readFile(manifestPath, "utf8")));
  const directory = path.dirname(manifestPath);
  const sourcePath = path.join(directory, data.sheet.source);
  const metadata = await sharp(sourcePath).metadata();
  const { width, height } = metadata;
  if (!width || !height || width % data.sheet.columns || height % data.sheet.rows) {
    throw new Error("source sheet must divide into integer cells");
  }
  const cellWidth = width / data.sheet.columns;
  const cellHeight = height / data.sheet.rows;
  if (cellWidth !== cellHeight || cellWidth < 64) throw new Error("source sheet needs square cells at least 64px");
  const key = parseHex(data.sheet.background);
  const rendered = [];
  for (let index = 0; index < data.entries.length; index += 1) {
    const entry = data.entries[index];
    const left = index % data.sheet.columns * cellWidth;
    const top = Math.floor(index / data.sheet.columns) * cellHeight;
    const { data: pixels, info } = await sharp(sourcePath)
      .extract({ left, top, width: cellWidth, height: cellHeight })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const output = await sharp(removeKey(pixels, info, key), {
      raw: { width: info.width, height: info.height, channels: info.channels },
    }).resize(64, 64, { kernel: sharp.kernel.nearest }).png().toBuffer();
    await sharp(output).toFile(path.join(directory, entry.path));
    rendered.push(output);
  }

  const tileWidth = 112;
  const tileHeight = 92;
  const contactWidth = tileWidth * data.sheet.columns;
  const contactHeight = tileHeight * data.sheet.rows;
  const composites = data.entries.flatMap((entry, index) => {
    const column = index % data.sheet.columns;
    const row = Math.floor(index / data.sheet.columns);
    const x = column * tileWidth;
    const y = row * tileHeight;
    return [
      { input: rendered[index], left: x + 24, top: y + 5 },
      {
        input: Buffer.from(`<svg width="${tileWidth}" height="23"><text x="56" y="15" text-anchor="middle" fill="#d8c6aa" font-family="sans-serif" font-size="11">${escapeXml(entry.label)}</text></svg>`),
        left: x,
        top: y + 68,
      },
    ];
  });
  await sharp({
    create: { width: contactWidth, height: contactHeight, channels: 4, background: "#17141a" },
  }).composite(composites).png().toFile(path.join(directory, data.sheet.contactSheet));
  return data.entries.length;
}

sliceIconSheet(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_MANIFEST)
  .then((count) => console.log(`Sliced ${count} master icons and contact sheet.`))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
