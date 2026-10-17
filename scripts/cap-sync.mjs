// Siapkan aplikasi Android: alamat web untuk halaman offline, izin aplikasi, lalu `cap sync`.
//   CAP_SERVER_URL=https://nama-app.vercel.app node scripts/cap-sync.mjs
import fs from "node:fs";
import { execSync } from "node:child_process";

const url = process.env.CAP_SERVER_URL || process.env.NEXT_PUBLIC_SITE_URL;
if (!url || !/^https:\/\//.test(url)) {
  console.error("Isi CAP_SERVER_URL dengan alamat Vercel, misal https://nama-app.vercel.app");
  process.exit(1);
}
fs.writeFileSync("native-shell/config.js", `window.AIW_URL = ${JSON.stringify(url.replace(/\/$/, ""))};\n`);

// Izin yang WAJIB ada di APK. Dipastikan di sini supaya tidak pernah ketinggalan,
// walaupun file AndroidManifest.xml di repo masih versi lama.
const MANIFEST = "android/app/src/main/AndroidManifest.xml";
const PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.VIBRATE",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
];
const FEATURES = ["android.hardware.camera", "android.hardware.microphone", "android.hardware.location.gps"];

let manifest = fs.readFileSync(MANIFEST, "utf8");
const added = [];
for (const p of PERMISSIONS) {
  if (!manifest.includes(`"${p}"`)) {
    manifest = manifest.replace("</manifest>", `    <uses-permission android:name="${p}" />\n</manifest>`);
    added.push(p);
  }
}
for (const f of FEATURES) {
  if (!manifest.includes(`"${f}"`)) {
    manifest = manifest.replace("</manifest>", `    <uses-feature android:name="${f}" android:required="false" />\n</manifest>`);
    added.push(f);
  }
}
fs.writeFileSync(MANIFEST, manifest);
console.log(added.length ? `Izin ditambahkan ke APK: ${added.join(", ")}` : "Semua izin aplikasi sudah lengkap.");
for (const p of PERMISSIONS) console.log(`  ✓ ${p}`);

execSync("npx cap sync android", { stdio: "inherit", env: { ...process.env, CAP_SERVER_URL: url } });
