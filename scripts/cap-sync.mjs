// Siapkan aplikasi Android: alamat web untuk halaman offline, lalu `cap sync`.
//   CAP_SERVER_URL=https://nama-app.vercel.app node scripts/cap-sync.mjs
import fs from "node:fs";
import { execSync } from "node:child_process";

const url = process.env.CAP_SERVER_URL || process.env.NEXT_PUBLIC_SITE_URL;
if (!url || !/^https:\/\//.test(url)) {
  console.error("Isi CAP_SERVER_URL dengan alamat Vercel, misal https://nama-app.vercel.app");
  process.exit(1);
}
fs.writeFileSync("native-shell/config.js", `window.AIW_URL = ${JSON.stringify(url.replace(/\/$/, ""))};\n`);
execSync("npx cap sync android", { stdio: "inherit", env: { ...process.env, CAP_SERVER_URL: url } });
