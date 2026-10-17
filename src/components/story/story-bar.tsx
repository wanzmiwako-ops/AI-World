"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Avatar } from "@/components/ui";
import { play } from "@/lib/feel";
import type { Highlight, Story, StoryFeed } from "@/lib/stories";
import { StoryComposer } from "./story-composer";
import { StoryViewer, type Person } from "./story-viewer";

const RING = "conic-gradient(from 210deg, var(--color-pink), var(--color-sand), var(--color-aqua), var(--color-ocean), var(--color-pink))";

function Bubble({
  label,
  onClick,
  ring,
  children,
  badge,
  delay = 0,
}: {
  label: string;
  onClick?: () => void;
  ring: "new" | "seen" | "none";
  children: React.ReactNode;
  badge?: React.ReactNode;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-[72px] shrink-0 flex-col items-center gap-1.5"
      style={{ animation: `pop-in .4s ease ${delay}s both` }}
    >
      <span className="relative">
        <span
          className="flex size-[68px] items-center justify-center rounded-full p-[3px]"
          style={{ background: ring === "new" ? RING : ring === "seen" ? "var(--color-line)" : "transparent", animation: ring === "new" ? "spin-slow 6s linear infinite" : undefined }}
        >
          <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-sky p-[2px]" style={{ animation: ring === "new" ? "spin-slow 6s linear infinite reverse" : undefined }}>
            {children}
          </span>
        </span>
        {badge}
      </span>
      <span className="w-full truncate text-center text-[12px] font-bold">{label}</span>
    </button>
  );
}

/** Deretan bulatan story di Beranda: story kamu, story pasangan, Sorotan, dan Timeline. */
export function StoryBar({ feed, me, partner, coupleId }: { feed: StoryFeed; me: Person; partner: Person | null; coupleId: string }) {
  const [viewer, setViewer] = useState<{ kind: "mine" | "partner" | "highlight"; start: number; highlightId?: string } | null>(null);
  const [composer, setComposer] = useState(false);
  const [seenLocal, setSeenLocal] = useState<Set<string>>(() => new Set());

  const mine = feed.stories.filter((s) => s.author_id === me.id);
  const theirs = feed.stories.filter((s) => s.author_id !== me.id);
  const isSeen = (s: Story) => seenLocal.has(s.id) || s.views.some((v) => v.user_id === me.id);
  const firstUnseen = theirs.findIndex((s) => !isSeen(s));
  const onSeen = useCallback((id: string) => setSeenLocal((prev) => (prev.has(id) ? prev : new Set(prev).add(id))), []);
  const close = useCallback(() => setViewer(null), []);

  let list: Story[] = [];
  let highlight: Highlight | null = null;
  if (viewer?.kind === "mine") list = mine;
  else if (viewer?.kind === "partner") list = theirs;
  else if (viewer?.kind === "highlight") {
    highlight = feed.highlights.find((h) => h.id === viewer.highlightId) ?? null;
    list = highlight?.stories ?? [];
  }

  return (
    <>
      <div className="scroll-row -mx-4 flex animate-rise gap-1 px-4 pb-1 lg:mx-0 lg:px-0">
        <div className="relative shrink-0">
          <Bubble
            label={mine.length ? "Story kamu" : "Bikin story"}
            ring={mine.length ? "seen" : "none"}
            onClick={() => {
              play("tap");
              if (mine.length) setViewer({ kind: "mine", start: 0 });
              else setComposer(true);
            }}
          >
            {mine.length && mine[mine.length - 1].thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mine[mine.length - 1].thumbUrl} alt="" className="size-full rounded-full object-cover" />
            ) : (
              <Avatar name={me.name} url={me.avatar} size={58} className="border-0" />
            )}
          </Bubble>
          <button
            type="button"
            aria-label="Bikin story baru"
            onClick={() => {
              play("tap");
              setComposer(true);
            }}
            className="absolute top-[46px] left-[50px] flex size-6 items-center justify-center rounded-full border-[3px] border-sky bg-ocean text-sm leading-none font-bold text-white"
          >
            +
          </button>
        </div>

        {partner && theirs.length > 0 && (
          <Bubble
            label={partner.name}
            ring={firstUnseen >= 0 ? "new" : "seen"}
            delay={0.05}
            onClick={() => {
              play("tap");
              setViewer({ kind: "partner", start: firstUnseen >= 0 ? firstUnseen : 0 });
            }}
            badge={
              firstUnseen >= 0 ? (
                <span className="absolute -top-1 -right-1 rounded-full bg-pink px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ animation: "beat 1.6s ease-in-out infinite" }}>
                  baru
                </span>
              ) : null
            }
          >
            <Avatar name={partner.name} url={partner.avatar} size={58} tone="aqua" className="border-0" />
          </Bubble>
        )}

        {feed.highlights.map((h, i) => {
          const cover = h.stories[h.stories.length - 1]?.thumbUrl;
          return (
            <Bubble
              key={h.id}
              label={h.title}
              ring="seen"
              delay={0.08 + i * 0.04}
              onClick={() => {
                play("tap");
                setViewer({ kind: "highlight", start: 0, highlightId: h.id });
              }}
              badge={<span className="absolute -right-1 -bottom-1 text-lg leading-none">{h.emoji ?? "⭐"}</span>}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="size-full rounded-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center rounded-full bg-tint text-2xl">{h.emoji ?? "⭐"}</span>
              )}
            </Bubble>
          );
        })}

        <Link href="/timeline" className="tap flex w-[72px] shrink-0 flex-col items-center gap-1.5" style={{ animation: "pop-in .4s ease .15s both" }}>
          <span className="flex size-[68px] items-center justify-center rounded-full border-2 border-dashed border-ocean/40 bg-tint text-[28px]">
            <span style={{ animation: "wiggle 3s ease-in-out infinite" }}>📖</span>
          </span>
          <span className="text-[12px] font-bold">Timeline</span>
        </Link>
      </div>

      {viewer && list.length > 0 && (
        <StoryViewer
          key={`${viewer.kind}-${viewer.highlightId ?? ""}`}
          stories={list}
          start={viewer.start}
          me={me}
          partner={partner}
          highlight={highlight}
          highlights={feed.highlights}
          onClose={close}
          onSeen={onSeen}
        />
      )}
      <StoryComposer open={composer} onClose={() => setComposer(false)} coupleId={coupleId} partnerName={partner?.name ?? "pasanganmu"} partnerId={partner?.id ?? null} />
    </>
  );
}

/** Hanya deretan Sorotan (dipakai di halaman Timeline). */
export function HighlightsRow({ feed, me, partner }: { feed: StoryFeed; me: Person; partner: Person | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const noop = useCallback(() => {}, []);
  const h = feed.highlights.find((x) => x.id === open) ?? null;
  return (
    <>
      <div className="scroll-row -mx-4 flex gap-1 px-4 lg:mx-0 lg:px-0">
        {feed.highlights.map((hl, i) => {
          const cover = hl.stories[hl.stories.length - 1]?.thumbUrl;
          return (
            <Bubble
              key={hl.id}
              label={hl.title}
              ring="new"
              delay={i * 0.04}
              onClick={() => {
                play("tap");
                setOpen(hl.id);
              }}
              badge={<span className="absolute -right-1 -bottom-1 text-lg leading-none">{hl.emoji ?? "⭐"}</span>}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="size-full rounded-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center rounded-full bg-tint text-2xl">{hl.emoji ?? "⭐"}</span>
              )}
            </Bubble>
          );
        })}
      </div>
      {h && h.stories.length > 0 && (
        <StoryViewer key={h.id} stories={h.stories} start={0} me={me} partner={partner} highlight={h} highlights={feed.highlights} onClose={close} onSeen={noop} />
      )}
    </>
  );
}
