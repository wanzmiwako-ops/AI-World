"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Pusat "live" aplikasi: satu koneksi realtime untuk seluruh halaman.
 * Komponen mana pun bisa membaca status (pasangan online, pesan belum dibaca)
 * dan mendengar kejadian (pesan masuk, check-in, kirim kangen, dll.).
 */

export type Toast = {
  id: number;
  title: string;
  body?: string;
  href?: string;
  tone?: "ocean" | "pink" | "sand" | "aqua";
  cat?: "mochi" | "boba";
  avatar?: string | null;
};

export type Person = { id: string; name: string; avatar: string | null };

type LiveState = {
  ready: boolean;
  coupleId: string | null;
  me: Person | null;
  partner: Person | null;
  partnerOnline: boolean;
  partnerPage: string | null;
  unread: number;
  toasts: Toast[];
  nudge: { kind: string; at: number } | null;
  theme: string;
  since: string | null;
};

let state: LiveState = {
  ready: false,
  coupleId: null,
  me: null,
  partner: null,
  partnerOnline: false,
  partnerPage: null,
  unread: 0,
  toasts: [],
  nudge: null,
  theme: "ocean",
  since: null,
};

const subscribers = new Set<() => void>();

export function setLive(patch: Partial<LiveState> | ((s: LiveState) => Partial<LiveState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  subscribers.forEach((fn) => fn());
}

export function getLive() {
  return state;
}

export function useLive<T>(selector: (s: LiveState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => selector(state),
    () => selector(state),
  );
}

let toastId = 0;
export function pushToast(t: Omit<Toast, "id">) {
  const id = ++toastId;
  setLive((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
  setTimeout(() => dismissToast(id), 4800);
  return id;
}
export function dismissToast(id: number) {
  setLive((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

/* ---------- Kejadian ---------- */

type Handler = (payload: Record<string, unknown>) => void;
const handlers = new Map<string, Set<Handler>>();

export function emitLive(event: string, payload: Record<string, unknown>) {
  handlers.get(event)?.forEach((h) => h(payload));
}

/** Dengarkan satu jenis kejadian live (misal "message", "typing", "checkin"). */
export function useLiveEvent(event: string, handler: Handler) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const fn: Handler = (p) => ref.current(p);
    let set = handlers.get(event);
    if (!set) handlers.set(event, (set = new Set()));
    set.add(fn);
    return () => {
      set!.delete(fn);
    };
  }, [event]);
}

/* ---------- Kanal realtime (diisi oleh LiveBridge) ---------- */

export const channels: { chat: RealtimeChannel | null; events: RealtimeChannel | null } = { chat: null, events: null };

export function broadcast(topic: "chat" | "events", event: string, payload: Record<string, unknown>) {
  void channels[topic]?.send({ type: "broadcast", event, payload });
}
