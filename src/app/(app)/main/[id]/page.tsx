import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { GameRow } from "@/lib/games/catalog";
import { GameRoom } from "./game-room";

export const metadata: Metadata = { title: "Main Bareng" };

async function Room({ params }: { params: PageProps<"/main/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [viewer, { data }] = await Promise.all([
    requireCouple(),
    supabase.from("games").select("id, kind, state, turn, status, winner, version, created_by, updated_at").eq("id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const partner = viewer.partner
    ? { id: viewer.partner.id, name: viewer.partner.display_name, avatar: viewer.partner.avatar_url }
    : { id: "", name: "Pasangan", avatar: null };
  return (
    <GameRoom
      key={id}
      initial={data as GameRow}
      me={{ id: viewer.userId, name: viewer.profile.display_name, avatar: viewer.profile.avatar_url }}
      partner={partner}
    />
  );
}

export default function GamePage(props: PageProps<"/main/[id]">) {
  return (
    <Page>
      <Suspense fallback={<div className="pt-[max(calc(env(safe-area-inset-top)+16px),24px)]"><PageSkeleton /></div>}>
        <Room params={props.params} />
      </Suspense>
    </Page>
  );
}
