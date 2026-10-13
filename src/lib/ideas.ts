export type Idea = {
  id: number;
  title: string;
  desc: string;
  budget: "Hemat" | "Sedang" | "Spesial";
  tempat: "Dalam" | "Luar";
  suasana: "Santai" | "Seru" | "Romantis";
  dur: string;
};

export const IDEAS: Idea[] = [
  { id: 1, title: "Piknik sore + main kartu", desc: "Tikar, bekal buatan sendiri, dan lihat matahari terbenam.", budget: "Hemat", tempat: "Luar", suasana: "Santai", dur: "2–3 jam" },
  { id: 2, title: "Kelas masak berdua", desc: "Masak bareng, makan hasilnya. Lucu kalau gagal.", budget: "Sedang", tempat: "Dalam", suasana: "Seru", dur: "3 jam" },
  { id: 3, title: "Jajan di pasar malam", desc: "Saling pilihkan 3 jajanan dengan budget yang disepakati.", budget: "Hemat", tempat: "Luar", suasana: "Seru", dur: "2 jam" },
  { id: 4, title: "Bikin scrapbook", desc: "Cetak 10 foto favorit dari galeri, tempel, kasih caption.", budget: "Hemat", tempat: "Dalam", suasana: "Romantis", dur: "2 jam" },
  { id: 5, title: "Dinner pakai dress code", desc: "Pilih tema baju, tanpa HP selama makan.", budget: "Spesial", tempat: "Dalam", suasana: "Romantis", dur: "2–3 jam" },
  { id: 6, title: "Sepeda pagi + sarapan", desc: "Rute santai 10 km lalu bubur ayam.", budget: "Hemat", tempat: "Luar", suasana: "Seru", dur: "3 jam" },
  { id: 7, title: "Movie night + rating", desc: "Pilih satu film masing-masing, yang kalah traktir camilan.", budget: "Hemat", tempat: "Dalam", suasana: "Santai", dur: "4 jam" },
  { id: 8, title: "Staycation semalam", desc: "Hotel dekat kota, berenang, room service.", budget: "Spesial", tempat: "Dalam", suasana: "Santai", dur: "1 malam" },
  { id: 9, title: "Hunting foto analog", desc: "Satu kamera sekali pakai berdua, keliling kota tua.", budget: "Sedang", tempat: "Luar", suasana: "Romantis", dur: "3 jam" },
  { id: 10, title: "Main ke cat café", desc: "Ngopi sambil main sama kucing-kucing gemas.", budget: "Sedang", tempat: "Dalam", suasana: "Santai", dur: "2 jam" },
  { id: 11, title: "Karaoke berdua", desc: "Masing-masing wajib nyanyi satu lagu pilihan pasangan.", budget: "Sedang", tempat: "Dalam", suasana: "Seru", dur: "2 jam" },
  { id: 12, title: "Lihat bintang", desc: "Cari tempat agak gelap, bawa selimut dan minuman hangat.", budget: "Hemat", tempat: "Luar", suasana: "Romantis", dur: "2 jam" },
];

/** Ide "hari ini" yang sama untuk berdua (berganti tiap hari). */
export function ideaOfTheDay(dayKey: string) {
  const n = dayKey.split("-").reduce((a, b) => a + Number(b), 0);
  return IDEAS[n % IDEAS.length];
}
