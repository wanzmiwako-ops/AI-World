"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Handlers = Record<string, (payload: Record<string, unknown>) => void>;

/**
 * Berlangganan Broadcast di private channel Supabase Realtime.
 * Topic: couple:<id>:chat atau couple:<id>:events (dijaga RLS di realtime.messages).
 */
export function useCoupleChannel(
  topic: string,
  handlers: Handlers,
  options: { presenceKey?: string; onPresence?: (online: string[]) => void; onReady?: (ch: RealtimeChannel) => void } = {},
) {
  const handlersRef = useRef(handlers);
  const optionsRef = useRef(options);
  useEffect(() => {
    handlersRef.current = handlers;
    optionsRef.current = options;
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    const presenceKey = optionsRef.current.presenceKey;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const ch = supabase.channel(topic, {
        config: { private: true, ...(presenceKey ? { presence: { key: presenceKey } } : {}) },
      });
      channel = ch;
      Object.keys(handlersRef.current).forEach((event) => {
        ch.on("broadcast", { event }, (msg: { payload?: Record<string, unknown> }) => handlersRef.current[event]?.(msg.payload ?? {}));
      });
      if (presenceKey) {
        ch.on("presence", { event: "sync" }, () => {
          optionsRef.current.onPresence?.(Object.keys(ch.presenceState()));
        });
      }
      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          if (presenceKey) await ch.track({ at: Date.now() });
          optionsRef.current.onReady?.(ch);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [topic]);
}
