import type { Metadata } from "next";
import { Suspense } from "react";
import { Cat } from "@/components/cat";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { formatShort } from "@/lib/dates";
import type { Issue, IssueResponse } from "@/lib/types";
import { IssueCard, IssueForm, type IssueItem } from "./issue-views";

export const metadata: Metadata = { title: "Ruang Bicara" };

async function IssuesContent() {
  const viewer = await requireCouple();
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("id, title, category, feeling, status, agreement, created_by, created_at, resolved_at, issue_responses(issue_id, user_id, feeling, created_at)")
    .eq("couple_id", viewer.couple.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const partnerName = viewer.partner?.display_name ?? "pasanganmu";
  const items: IssueItem[] = ((data ?? []) as (Issue & { issue_responses: IssueResponse[] })[]).map((i) => {
    const mine = i.created_by === viewer.userId;
    const response = i.issue_responses?.[0] ?? null;
    const iWrote = mine ? true : Boolean(response);
    const bothWrote = Boolean(response);
    return {
      id: i.id,
      title: i.title,
      category: i.category,
      date: formatShort(i.created_at),
      status: i.status,
      agreement: i.agreement,
      mine,
      myFeeling: mine ? i.feeling : response?.feeling ?? null,
      // Cerita pasangan baru terbuka setelah keduanya menulis
      partnerFeeling: bothWrote ? (mine ? response?.feeling ?? null : i.feeling) : null,
      needsMyResponse: !iWrote && i.status === "waiting",
    };
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <ol className="flex animate-rise items-center justify-between rounded-[20px] bg-white px-4 py-3 text-sm font-bold">
          {[
            ["1", "Cerita", "bg-tint text-ocean-dark"],
            ["2", "Dengar", "bg-aqua-soft text-aqua-ink"],
            ["3", "Sepakat", "bg-sand-soft text-sand-ink"],
          ].map(([n, t, cls]) => (
            <li key={n} className="flex items-center gap-1.5">
              <span className={`flex size-6 items-center justify-center rounded-full text-xs ${cls}`}>{n}</span>
              {t}
            </li>
          ))}
        </ol>
        <IssueForm partnerName={partnerName} />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="riwayat">
        <h2 id="riwayat" className="font-display text-xl font-medium">Riwayat</h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[26px] border-2 border-dashed border-[#C4DCEC] p-6 text-center">
            <Cat variant="boba" size={80} mood="joy" />
            <p className="text-[15px] text-muted">Belum ada yang perlu dibahas. Semoga tetap begini, ya!</p>
          </div>
        ) : (
          items.map((i) => <IssueCard key={i.id} issue={i} partnerName={partnerName} />)
        )}
      </section>
    </div>
  );
}

export default function RuangBicaraPage() {
  return (
    <Page>
      <PageHeader title="Ruang Bicara" subtitle="Ngobrol pelan-pelan, selesaikan bareng." back="/" />
      <Suspense fallback={<PageSkeleton />}>
        <IssuesContent />
      </Suspense>
    </Page>
  );
}
