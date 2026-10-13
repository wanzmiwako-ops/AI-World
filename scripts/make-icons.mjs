// Membuat ikon PWA dari scripts/app-icon.svg  →  node scripts/make-icons.mjs
import sharp from "sharp";
import fs from "node:fs";
const svg = fs.readFileSync(new URL("./app-icon.svg", import.meta.url));
const rounded = (size) => Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#fff"/></svg>`);
for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(`public/icons/maskable-${size}.png`);
  await sharp(svg).resize(size, size).composite([{ input: rounded(size), blend: "dest-in" }]).png().toFile(`public/icons/icon-${size}.png`);
}
await sharp(svg).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(svg).resize(64, 64).composite([{ input: rounded(64), blend: "dest-in" }]).png().toFile("src/app/icon.png");
console.log("ikon dibuat");
