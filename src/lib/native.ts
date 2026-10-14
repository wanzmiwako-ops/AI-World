"use client";

/**
 * Jembatan ke aplikasi Android (Capacitor). Semua fungsi aman dipanggil di browser biasa:
 * kalau bukan di dalam aplikasi, tidak melakukan apa-apa.
 */
import { Capacitor } from "@capacitor/core";

export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function nativePlatform(): "android" | "ios" | "web" {
  return isNativeApp() ? (Capacitor.getPlatform() as "android" | "ios") : "web";
}

type Handlers = {
  navigate: (url: string) => void;
  saveToken: (token: string, platform: string) => Promise<unknown>;
  away: () => void;
  back: () => void;
};

let started = false;

export type NativePushState = "granted" | "denied" | "prompt" | "unavailable";

export async function nativePushState(): Promise<NativePushState> {
  if (!isNativeApp()) return "unavailable";
  const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
  try {
    const p = await FirebaseMessaging.checkPermissions();
    return p.receive === "granted" ? "granted" : p.receive === "denied" ? "denied" : "prompt";
  } catch {
    return "unavailable";
  }
}

/** Minta izin & daftarkan HP ini untuk notifikasi. */
export async function enableNativePush(saveToken: Handlers["saveToken"]): Promise<{ ok?: boolean; error?: string }> {
  if (!isNativeApp()) return { error: "Bukan aplikasi." };
  const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
  try {
    let p = await FirebaseMessaging.checkPermissions();
    if (p.receive !== "granted") p = await FirebaseMessaging.requestPermissions();
    if (p.receive !== "granted") return { error: "Izin notifikasi ditolak. Buka Pengaturan HP → Aplikasi → A&I WORLD → Notifikasi." };
    const { token } = await FirebaseMessaging.getToken();
    await saveToken(token, nativePlatform());
    return { ok: true };
  } catch (e) {
    return { error: `Notifikasi belum bisa aktif: ${(e as Error).message}` };
  }
}

/** Dipanggil sekali saat aplikasi terbuka. */
export async function startNative(h: Handlers) {
  if (!isNativeApp() || started) return;
  started = true;

  const [{ App }, { SplashScreen }, { FirebaseMessaging, Importance }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/splash-screen"),
    import("@capacitor-firebase/messaging"),
  ]);

  void SplashScreen.hide();

  // Tombol kembali Android: mundur satu halaman, atau keluar ke layar utama HP
  void App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack && location.pathname !== "/") h.back();
    else void App.minimizeApp();
  });
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) h.away();
  });

  // Saluran notifikasi Android: pesan & kangen bersuara meong
  try {
    await FirebaseMessaging.createChannel({
      id: "pesan",
      name: "Pesan & kangen",
      description: "Chat dan kirim rasa dari pasangan",
      importance: Importance.High,
      sound: "meow",
      vibration: true,
      lights: true,
      lightColor: "#FF7A93",
    });
    await FirebaseMessaging.createChannel({
      id: "kabar",
      name: "Kabar lain",
      description: "Jadwal, check-in, galeri, game, Ruang Bicara",
      importance: Importance.High,
      vibration: true,
    });
  } catch {}

  // Ketuk notifikasi → buka halaman terkait
  void FirebaseMessaging.addListener("notificationActionPerformed", (e) => {
    const data = (e.notification?.data ?? {}) as { url?: string };
    if (data.url?.startsWith("/")) h.navigate(data.url);
  });
  void FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
    void h.saveToken(token, nativePlatform());
  });

  // Sudah pernah diizinkan → perbarui token (token bisa berganti sewaktu-waktu)
  try {
    const p = await FirebaseMessaging.checkPermissions();
    if (p.receive === "granted") {
      const { token } = await FirebaseMessaging.getToken();
      await h.saveToken(token, nativePlatform());
    } else if (p.receive === "prompt" || p.receive === "prompt-with-rationale") {
      await enableNativePush(h.saveToken);
    }
  } catch {}
}

/** Warna bar status (jam, baterai) mengikuti latar tema: latar terang, ikon gelap. */
export async function nativeStatusBar(color: string) {
  if (!isNativeApp()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color });
  } catch {}
}
