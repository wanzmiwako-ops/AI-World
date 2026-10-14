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
| **Chat realtime** | Pesan teks, foto, hati, stiker kucing, balasan cepat, status *sedang mengetik*, *online*, dan *dibaca*. |
| **Kalender pertemuan** | Jadwal ketemu per bulan, tambah/hapus jadwal. Pertemuan yang sudah lewat menampilkan lama ketemu dari Mode Ketemu. |
| **Mode Ketemu (check-in)** | Check-in berdua saat bertemu, sah hanya kalau lokasi GPS kalian berdekatan (maks. 500 m). Timer berjalan, foto berdua langsung masuk galeri, pilih mood, ringkasan di akhir. Halaman berubah otomatis begitu pasangan check-in. |
| **Love Meter** | Skor 0–100 dari data nyata: seberapa sering ketemu, jumlah chat, mood harian berdua, dan masalah yang selesai. Kucingnya ikut berekspresi sesuai mood. |
| **Ide Kencan** | Filter suasana & budget, tombol "Kocok ide", langsung masukkan ke kalender. |
| **Ruang Bicara** | Tulis masalah dengan tenang → pasangan menulis sisi ceritanya (cerita masing-masing baru terbuka setelah keduanya menulis) → tulis kesepakatan. |
| **Galeri** | Upload banyak foto sekaligus (otomatis dikecilkan), album per hari ketemuan, "Setahun lalu hari ini", lihat & hapus foto. |
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
    manifest.ts               ← PWA
  components/                 ← kucing (cat.tsx), logo, menu, komponen UI
  lib/
    dal.ts                    ← satu-satunya tempat membaca sesi login
    supabase/                 ← client untuk server, browser, dan proxy
    realtime.ts               ← hook Realtime Broadcast + Presence
    love-meter.ts             ← rumus skor Love Meter
supabase/migrations/          ← skema database lengkap
scripts/                      ← pembuat ikon PWA
```

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
