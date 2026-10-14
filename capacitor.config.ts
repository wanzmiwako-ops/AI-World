import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Aplikasi Android A&I WORLD.
 * Aplikasinya membuka versi online (Vercel) di dalam bingkai aplikasi asli,
 * jadi setiap update di Vercel langsung terasa di aplikasi tanpa install ulang.
 * Alamatnya diambil dari CAP_SERVER_URL (diisi saat build, lihat README).
 */
const url = process.env.CAP_SERVER_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://ai-world.vercel.app";

const config: CapacitorConfig = {
  appId: "com.aiworld.app",
  appName: "A&I WORLD",
  webDir: "native-shell",
  server: {
    url,
    cleartext: false,
    androidScheme: "https",
    // Tampil saat tidak ada internet
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#F2F8FC",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0A6EBD",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
    },
    // Android 15+: aplikasi tampil penuh sampai ke balik bar status. Jarak atas/bawah
    // diatur lewat env(safe-area-inset-*) yang sudah dipakai di tampilan web.
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "LIGHT",
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
