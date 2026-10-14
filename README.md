# A&I WORLD 🐾

Aplikasi khusus pasangan: dunia kecil untuk kita berdua.
Bisa dibuka di HP (tampil seperti aplikasi native dan bisa di-install ke home screen) dan di PC (dashboard dengan menu samping).

Maskotnya sepasang kucing: **Mochi** (biru) dan **Boba** (oren).

## Fitur

| Fitur | Isi |
|---|---|
| **Login email** | Daftar & masuk pakai email + kata sandi, atau link masuk ke email (tanpa kata sandi). Lupa kata sandi lewat email. |
| **Pairing pasangan** | Satu orang membuat kode undangan 6 karakter, pasangannya memasukkan kode itu (di halaman awal, Beranda, atau Akun). Kalau dua-duanya terlanjur membuat kode, salah satu tinggal memasukkan kode pasangannya: isi ruangnya otomatis digabung. Maksimal 2 orang per ruang. |
| **Beranda / Dashboard** | Hari bersama (angka menghitung naik), hitung mundur ke pertemuan berikutnya, Love Meter, topik Ruang Bicara, pesan belum dibaca, ide hari ini, foto terbaru. |
| **Chat realtime** | Pesan teks, foto, hati, stiker kucing, balasan cepat, status *sedang mengetik*, *online*, dan *dibaca*. **Balas pesan tertentu**: geser bubble ke kanan (HP), tekan lama → Balas, atau tombol Balas saat kursor di atas pesan (PC). Ketuk kutipan untuk lompat ke pesan aslinya. |
| **Aplikasi Android** | APK asli (Capacitor) dengan notifikasi Firebase yang andal, bunyi *meong* untuk pesan & kangen, ikon & layar pembuka kucing, tombol kembali Android. Isinya tetap versi web di Vercel, jadi update web langsung terasa tanpa install ulang. |
| **Kalender pertemuan** | Jadwal ketemu per bulan, tambah/hapus jadwal. Pertemuan yang sudah lewat menampilkan lama ketemu dari Mode Ketemu. |
| **Mode Ketemu (check-in)** | Check-in berdua saat bertemu, sah hanya kalau lokasi GPS kalian berdekatan (maks. 500 m). Timer berjalan, foto berdua langsung masuk galeri, pilih mood, ringkasan di akhir. Halaman berubah otomatis begitu pasangan check-in. |
| **Love Meter** | Skor 0–100 dari data nyata: seberapa sering ketemu, jumlah chat, mood harian berdua, dan masalah yang selesai. Kucingnya ikut berekspresi sesuai mood. |
| **Ide Kencan** | Filter suasana & budget, tombol "Kocok ide", langsung masukkan ke kalender. |
| **Ruang Bicara** | Tulis masalah dengan tenang → pasangan menulis sisi ceritanya (cerita masing-masing baru terbuka setelah keduanya menulis) → tulis kesepakatan. |
| **Galeri** | Upload banyak foto sekaligus (otomatis dikecilkan), album per hari ketemuan, "Setahun lalu hari ini", lihat & hapus foto. |
| **Notifikasi** | Notifikasi push ke HP walau aplikasi ditutup (pesan, check-in, jadwal, Ruang Bicara, foto, kirim kangen), notifikasi di dalam aplikasi yang muncul dari atas, angka pesan belum dibaca di menu & ikon aplikasi. |
| **Kunci PIN** | PIN 4 angka (disimpan sebagai hash bcrypt, dicek di server). Terkunci otomatis setelah 1/5/15 menit ditinggal. 5× salah → jeda. Lupa PIN → masuk pakai kata sandi akun. |
| **Kirim rasa** | Kangen, Peluk, Cium, Semangat: satu ketukan, pasangan langsung dapat kejutan layar penuh + notifikasi. |
| **Suasana** | Kucing bisa dicolek (melompat, mengeong, bicara), hati beterbangan, efek suara & getar, status "Ica lagi online · buka Galeri", sapaan sesuai waktu, perayaan hari ke-100/anniversary. |
| **Tema dunia** | 7 tema untuk berdua: Samudra Biru, Taman Bunga, Hutan Safari, Pasar Malam, Misteri Malam, Malam Bioskop, Luar Angkasa. Warna, hiasan melayang, dan gambar khas ikut berubah, dan langsung berganti juga di HP pasangan. |
| **Main bareng** | 5 game realtime berdua: **Teka-Teki Silang** (papan baru setiap main, isi bareng di satu papan), **UNO Kucing**, **Kita Sehati?** (jawab diam-diam, lihat seberapa kompak), **XO Kucing**, dan **Kartu Ngobrol** (pertanyaan manis, dalam, lucu, tantangan). Ada papan skor, ajakan main lewat notifikasi, dan status "giliranmu". |
| **Tampilan PC** | Menu samping, konten lebih lebar, panel kanan (pasangan, game berjalan, jadwal, ide hari ini), dan latar bertema. |
| **Akun** | Ganti foto profil, nama panggilan, tanggal jadian, ganti kata sandi (wajib kata sandi lama), bagikan kode undangan, keluar. |

## Teknologi (versi terbaru per Oktober 2026)

- **Next.js 16.4** (App Router, Cache Components, Partial Prefetching, Turbopack, `proxy.ts`) + **React 19.3**
- **Tailwind CSS v4**
- **Supabase**: Auth (email), Postgres + Row Level Security, Realtime **Broadcast di private channel** (cara yang direkomendasikan Supabase untuk chat), Presence, Storage
- **PWA**: manifest + ikon, bisa di-install di Android & iPhone
- Deploy: **GitHub → Vercel**, database & login di **Supabase**

Semua data dijaga di database dengan RLS: hanya kalian berdua yang bisa membaca data ruang kalian, termasuk channel realtime dan foto.

---

## Cara menjalankan

### 1. Siapkan Supabase

1. Buat project baru di [supabase.com](https://supabase.com) (pilih region **Singapore** biar cepat dari Indonesia).
2. Buka **SQL Editor** → **New query**, lalu jalankan **semua file** di folder `supabase/migrations` **berurutan**
   (salin isi file → klik **Run**, lalu file berikutnya):
   1. `20261013000000_ai_world.sql`: semua tabel, keamanan (RLS), check-in, realtime, bucket foto
   2. `20261013170000_gabung_pakai_kode.sql`: supaya bisa gabung pakai kode walau sudah sama-sama membuat ruang
   3. `20261013210000_lebih_cepat.sql`: mempercepat aplikasi (query digabung, index, thumbnail foto)
   4. `20261014090000_pin_notifikasi_kangen.sql`: kunci PIN, notifikasi push, "kirim kangen", aktivitas realtime
   5. `20261014150000_tema_game.sql`: tema dunia & game bareng
   6. `20261014200000_balas_aplikasi.sql`: balas bubble chat & notifikasi aplikasi Android
   7. `20261014230000_audit_keamanan.sql`: pengetatan keamanan hasil audit (foto, PIN, hak ubah data, batas teks)

   > Sudah pernah menjalankan sebagian? Cukup jalankan file yang belum.
3. Buka **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (nanti ganti ke URL Vercel)
   - **Redirect URLs**, tambahkan:
     - `http://localhost:3000/auth/callback`
     - `https://NAMA-APP.vercel.app/auth/callback`
4. Buka **Project Settings → API Keys**, salin **Project URL** dan **Publishable key**.
5. **Project Settings → JWT Keys**: pastikan memakai **JWT Signing Keys (asymmetric)**. Project baru biasanya sudah otomatis.
   Kalau masih "Legacy JWT secret", klik migrasi. Dengan kunci baru, cek login dilakukan langsung di server Vercel tanpa
   bertanya ke Supabase setiap kali pindah halaman, jadi jauh lebih cepat.
6. (Opsional, lebih aman) **Realtime → Settings**: matikan akses ke channel publik, karena aplikasi ini hanya memakai private channel.

### 2. Jalankan di laptop

Butuh Node.js 20.9 atau lebih baru.

```bash
npm install
cp .env.example .env.local   # lalu isi URL & publishable key dari Supabase
npm run dev
```

Buka http://localhost:3000, daftar akun pertama, buat ruang berdua, lalu kirim kode undangan ke pasangan.

### 3. Upload ke GitHub

```bash
git add .
git commit -m "A&I WORLD"
git branch -M main
git remote add origin https://github.com/USERNAME/ai-world.git
git push -u origin main
```

### 4. Deploy ke Vercel

1. Di [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo `ai-world`.
2. Di **Environment Variables**, isi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://NAMA-APP.vercel.app`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (untuk notifikasi, lihat bagian **Notifikasi** di bawah)
3. Klik **Deploy**.
4. Kembali ke Supabase → **Authentication → URL Configuration**, ganti **Site URL** ke URL Vercel.

Setiap `git push` ke `main` akan otomatis ter-deploy ulang.

> **Penting untuk kecepatan:** file `vercel.json` sudah mengatur server Vercel di **Singapura (`sin1`)**, sama dengan
> lokasi Supabase yang disarankan. Kalau project Supabase-mu ada di region lain, ganti `sin1` ke region Vercel yang paling
> dekat dengan Supabase-mu. Server dan database yang berjauhan (misal Amerika ↔ Singapura) membuat setiap halaman
> lambat 1–2 detik.

### 5. Install di HP

- **iPhone (Safari)**: buka web-nya → tombol Share → **Add to Home Screen**.
- **Android (Chrome)**: buka web-nya → menu ⋮ → **Install app**.

Aplikasi akan terbuka layar penuh dengan ikon kucing, seperti aplikasi biasa.

---

## Struktur folder

```
src/
  proxy.ts                    ← cek login di setiap request (pengganti middleware di Next.js 16)
  app/
    (auth)/                   ← login, daftar, lupa kata sandi
    auth/callback/            ← tujuan link dari email Supabase
    onboarding/               ← buat ruang / gabung pakai kode
    (app)/                    ← semua halaman setelah login
      page.tsx                ← Beranda
      chat/  kalender/  ketemu/  love-meter/  ide/  ruang-bicara/  galeri/  akun/
      main/                   ← Main Bareng (daftar game) & main/[id] (ruang game)
      tema/                   ← pilih tema dunia
    manifest.ts               ← PWA
  components/                 ← kucing (cat.tsx), logo, menu, komponen UI
  lib/
    dal.ts                    ← satu-satunya tempat membaca sesi login
    supabase/                 ← client untuk server, browser, dan proxy
    realtime.ts               ← hook Realtime Broadcast + Presence
    love-meter.ts             ← rumus skor Love Meter
    themes.ts                 ← daftar tema (warnanya di globals.css)
    games/                    ← aturan game: TTS (pembuat papan), UNO, XO, kartu
supabase/migrations/          ← skema database lengkap
scripts/                      ← pembuat ikon PWA & aset Android, sinkron Capacitor
android/                      ← proyek aplikasi Android (Capacitor)
native-shell/                 ← halaman "tidak ada internet" di aplikasi
.github/workflows/android.yml ← build APK otomatis
```

## Notifikasi (sekali setup)

1. Di laptop, di folder proyek, jalankan:
   ```bash
   npm run vapid
   ```
   Hasilnya dua kunci: **Public Key** dan **Private Key**.
2. Isi ke `.env.local` **dan** ke Vercel → Project → Settings → Environment Variables:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key
   - `VAPID_PRIVATE_KEY` = Private Key (rahasia, jangan dibagikan)
   - `VAPID_SUBJECT` = `mailto:emailkamu@gmail.com`
3. Redeploy di Vercel (Deployments → ⋯ → Redeploy).
4. Di HP masing-masing: buka aplikasi → **Akun → Notifikasi & suara → Notifikasi push** → izinkan.
   - **iPhone:** wajib dibuka dari ikon di Home Screen (Safari → Share → Add to Home Screen), iOS 16.4 ke atas.
   - **Android:** bisa langsung dari Chrome, lebih enak kalau di-install juga.
5. Tekan **Kirim notifikasi uji** untuk mengecek.

Kalau pasangan sedang membuka aplikasi, notifikasi push tidak dikirim (dia sudah melihat notifikasi di dalam aplikasi), jadi tidak dobel.

## Aplikasi Android (APK)

APK dibuat otomatis oleh **GitHub Actions** di cloud. Tidak perlu install Android Studio atau Node.js di laptop.

### A. Firebase (sekali saja, untuk notifikasi)

1. Buka [console.firebase.google.com](https://console.firebase.google.com) → **Create a project** → nama bebas (misal `A&I WORLD`), Google Analytics boleh dimatikan.
2. Di halaman project: ikon **Android** (Add app) → **Android package name**: `com.aiworld.app` → **Register app** →
   **Download google-services.json**. Langkah SDK berikutnya lewati saja (Next → Continue to console).
3. ⚙️ **Project settings → Service accounts → Generate new private key** → file JSON terunduh. File ini **rahasia**.

### B. Vercel

**Settings → Environment Variables**, tambahkan:
- `FIREBASE_SERVICE_ACCOUNT` = buka file JSON dari langkah A.3 dengan Notepad, salin **seluruh isinya**, tempel di sini.
- (opsional) `NEXT_PUBLIC_ANDROID_APK_URL` = `https://github.com/USERNAME/ai-world/releases/latest/download/A-I-WORLD.apk`
  (memunculkan tombol "Pasang aplikasi Android" di Akun; hanya bisa diunduh tanpa login kalau repo publik).

Lalu **Redeploy**.

### C. GitHub (repo → Settings → Secrets and variables → Actions)

- Tab **Variables** → New repository variable:
  - `CAP_SERVER_URL` = alamat Vercel, misal `https://nama-app.vercel.app`
- Tab **Secrets** → New repository secret:
  - `GOOGLE_SERVICES_JSON` = isi file `google-services.json` (buka dengan Notepad, salin semua)
  - `ANDROID_KEYSTORE_BASE64` dan `ANDROID_KEYSTORE_PASSWORD` = dari file `android-secrets.txt` yang dikirim terpisah

> **Simpan kunci tanda tangan (keystore) baik-baik dan jangan dibagikan.** APK versi baru hanya bisa dipasang menimpa
> versi lama kalau ditandatangani dengan kunci yang sama.

### D. Build & pasang

1. GitHub → tab **Actions** → **Build APK Android** → **Run workflow** (±5–8 menit).
   Setelah itu, build juga berjalan otomatis setiap ada perubahan di folder `android/`.
2. Tab **Releases** (halaman depan repo, kolom kanan) → unduh **A-I-WORLD.apk**.
3. Kirim file APK ke HP (atau ke pasangan lewat WhatsApp/Drive) → buka → izinkan **Instal aplikasi tidak dikenal**.
4. Buka A&I WORLD → login → izinkan notifikasi. Selesai!
5. Uji: **Akun → Notifikasi & suara → Kirim notifikasi uji**. Harus bunyi *meong* 🐱

Tips HP **Xiaomi / Oppo / Vivo / Realme**: buka Pengaturan → Aplikasi → A&I WORLD → aktifkan **Mulai otomatis (Autostart)** dan
setel **Baterai → Tanpa batasan**, supaya notifikasi tidak ditahan sistem.

Catatan:
- Perubahan tampilan/fitur web langsung muncul di aplikasi (aplikasi membuka versi Vercel). APK baru hanya perlu dipasang ulang
  kalau ada perubahan di folder `android/`.
- Di dalam aplikasi, masuk pakai **email + kata sandi**. Link masuk lewat email akan terbuka di browser, bukan di aplikasi.

## Kunci PIN

Akun → **Keamanan → Pasang PIN**. Setelah aktif, aplikasi meminta PIN setiap kali dibuka lagi setelah ditinggal
lebih lama dari batas (1, 5, atau 15 menit). PIN tidak disimpan di HP: yang disimpan di database hanya hash-nya, dan
pengecekannya di server. Lupa PIN → di layar PIN ketuk **Lupa PIN?** lalu masukkan kata sandi akun.

## Kenapa cepat

- Server Vercel dan database Supabase di kota yang sama (Singapura).
- Data akun + pasangan diambil dalam **1 panggilan** database; isi Beranda dan Love Meter juga masing-masing 1 panggilan.
- Setiap halaman mengambil semua datanya **bersamaan**, tidak antre satu per satu.
- Foto disimpan dalam 2 ukuran: **thumbnail ±30 KB** untuk grid & chat, foto penuh hanya saat dibuka.
- Bagian yang lambat (misal foto) dimuat terpisah, jadi isi halaman lain muncul duluan.
- Ikon menu langsung bereaksi saat diketuk.

> Mode `npm run dev` memang lebih lambat karena kode dikompilasi saat dibuka. Cek kecepatan sebenarnya di versi Vercel.

## Perintah lain

```bash
npm run build       # build produksi (dicek otomatis oleh Vercel)
npm run lint        # cek kode
npm run typecheck   # cek TypeScript
npm run icons       # buat ulang ikon dari scripts/app-icon.svg
```

## Ide pengembangan berikutnya

- Notifikasi push (pesan baru, pasangan sudah check-in) lewat Web Push
- Kapsul waktu: surat yang baru bisa dibuka saat anniversary
- Bucket list & wishlist hadiah
- Versi aplikasi native (Expo) yang memakai database Supabase yang sama
