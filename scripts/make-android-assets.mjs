// Membuat ikon, splash, ikon notifikasi, dan suara "meong" untuk aplikasi Android
//   node scripts/make-android-assets.mjs
import sharp from "sharp";
import fs from "node:fs";

const RES = "android/app/src/main/res";
const icon = fs.readFileSync(new URL("./app-icon.svg", import.meta.url));
const badge = fs.readFileSync(new URL("./badge.svg", import.meta.url));
const BLUE = { r: 10, g: 110, b: 189, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const mask = (size, round) =>
  Buffer.from(`<svg width="${size}" height="${size}">${round ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/>` : `<rect width="${size}" height="${size}" rx="${size * 0.2}"/>`}</svg>`);

for (const [d, k] of Object.entries(dens)) {
  const dir = `${RES}/mipmap-${d}`;
  fs.mkdirSync(dir, { recursive: true });
  const s = Math.round(48 * k);
  await sharp(icon).resize(s, s).composite([{ input: mask(s, false), blend: "dest-in" }]).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(icon).resize(s, s).composite([{ input: mask(s, true), blend: "dest-in" }]).png().toFile(`${dir}/ic_launcher_round.png`);
  // Ikon adaptif: 108dp, isi di tengah (bagian luar bisa terpotong bentuk ikon HP)
  const f = Math.round(108 * k);
  const inner = Math.round(f * 0.7);
  const art = await sharp(icon).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: f, height: f, channels: 4, background: CLEAR } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);

  // Ikon kecil notifikasi (putih, transparan) 24dp
  const nd = `${RES}/drawable-${d}`;
  fs.mkdirSync(nd, { recursive: true });
  const n = Math.round(24 * k);
  await sharp(badge).resize(n, n, { fit: "contain", background: CLEAR }).png().toFile(`${nd}/ic_stat_notify.png`);
}

// Warna latar ikon adaptif & warna notifikasi
fs.writeFileSync(
  `${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0A6EBD</color>\n    <color name="notification_color">#0A6EBD</color>\n</resources>\n`,
);

// Layar pembuka: biru laut + kucing di tengah
const splashSizes = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
async function splash(w, h, file) {
  const s = Math.round(Math.min(w, h) * 0.42);
  const art = await sharp(icon).resize(s, s).composite([{ input: mask(s, false), blend: "dest-in" }]).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: BLUE } }).composite([{ input: art, gravity: "center" }]).png().toFile(file);
}
for (const [d, [w, h]] of Object.entries(splashSizes)) {
  for (const [o, ww, hh] of [["port", w, h], ["land", h, w]]) {
    const dir = `${RES}/drawable-${o}-${d}`;
    fs.mkdirSync(dir, { recursive: true });
    await splash(ww, hh, `${dir}/splash.png`);
  }
}
await splash(480, 320, `${RES}/drawable/splash.png`);

// Suara notifikasi pesan: rekaman meong kucing (scripts/sounds/meow.ogg)
fs.mkdirSync(`${RES}/raw`, { recursive: true });
for (const f of fs.readdirSync(`${RES}/raw`)) if (f.startsWith("meow.")) fs.rmSync(`${RES}/raw/${f}`);
fs.copyFileSync(new URL("./sounds/meow.ogg", import.meta.url), `${RES}/raw/meow.ogg`);
console.log("aset Android dibuat");
