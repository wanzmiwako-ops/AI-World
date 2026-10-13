"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createIssue, resolveIssue, respondIssue } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const CATEGORIES = ["Komunikasi", "Waktu", "Keuangan", "Keluarga", "Lainnya"];

export type IssueItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  status: "waiting" | "discussing" | "resolved";
  agreement: string | null;
  mine: boolean;
  myFeeling: string | null;
  partnerFeeling: string | null; // hanya terisi kalau keduanya sudah menulis
  needsMyResponse: boolean;
};

export function IssueForm({ partnerName }: { partnerName: string }) {
  const [state, action] = useActionState(createIssue, undefined);
  const [category, setCategory] = useState("Komunikasi");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card flex animate-rise flex-col gap-4 p-5">
      <h2 className="font-display text-xl font-medium">Ada yang ngeganjel?</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="label">Topiknya</label>
        <input id="title" name="title" required maxLength={120} placeholder="Misal: jarang telepon pas weekday" className="field" />
      </div>
      <input type="hidden" name="category" value={category} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kategori">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className="chip min-h-9 text-[13px]">
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="feeling" className="label">Aku merasa…</label>
        <textarea id="feeling" name="feeling" rows={3} placeholder="Pakai “aku merasa”, bukan “kamu selalu”." className="field min-h-24 resize-none py-3" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Mengirim…">Kirim ke {partnerName}</SubmitButton>
    </form>
  );
}

const STATUS = {
  waiting: { label: "Menunggu", cls: "bg-sand-soft text-sand-ink" },
  discussing: { label: "Dibahas", cls: "bg-tint text-ocean-dark" },
  resolved: { label: "Selesai", cls: "bg-aqua-soft text-aqua-ink" },
} as const;

function RespondForm({ issueId }: { issueId: string }) {
  const [state, action] = useActionState(respondIssue, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[18px] bg-sky p-4">
      <input type="hidden" name="issue_id" value={issueId} />
      <label htmlFor={`r-${issueId}`} className="label">Dari sisiku, aku merasa…</label>
      <textarea id={`r-${issueId}`} name="feeling" rows={3} required className="field min-h-20 resize-none py-3" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Mengirim…">Kirim sisi ceritaku</SubmitButton>
    </form>
  );
}

function ResolveForm({ issueId }: { issueId: string }) {
  const [state, action] = useActionState(resolveIssue, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[18px] bg-sky p-4">
      <input type="hidden" name="issue_id" value={issueId} />
      <label htmlFor={`a-${issueId}`} className="label">Kesepakatan kita</label>
      <textarea id={`a-${issueId}`} name="agreement" rows={2} required placeholder="Satu langkah kecil yang kita sepakati…" className="field min-h-20 resize-none py-3" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Menyimpan…" className="btn btn-dark w-full">Tandai selesai</SubmitButton>
    </form>
  );
}

export function IssueCard({ issue, partnerName }: { issue: IssueItem; partnerName: string }) {
  const [open, setOpen] = useState(issue.needsMyResponse);
  const step = issue.status === "resolved" ? 3 : issue.status === "discussing" ? 2 : 1;
  const s = STATUS[issue.status];

  return (
    <article className="card flex animate-rise flex-col gap-3 p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-start justify-between gap-3 text-left">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] leading-snug font-bold">{issue.title}</span>
          <span className="text-[13px] text-muted">
            {issue.category} · {issue.date}
          </span>
        </span>
        <span className={`shrink-0 rounded-[10px] px-2.5 py-1 text-xs font-bold ${s.cls}`}>
          {issue.needsMyResponse ? "Giliranmu" : issue.status === "waiting" ? `Nunggu ${partnerName}` : s.label}
        </span>
      </button>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 rounded-full ${n <= step ? (step === 3 ? "bg-[#2BB3C9]" : "bg-ocean") : "bg-[#E8F0F6]"}`} />
        ))}
      </div>

      {issue.agreement && (
        <p className="rounded-[14px] bg-aqua-soft px-3.5 py-2.5 text-sm">
          <b>Sepakat:</b> {issue.agreement}
        </p>
      )}

      {open && (
        <div className="flex animate-rise flex-col gap-3">
          {issue.myFeeling && (
            <p className="rounded-[14px] bg-sky px-3.5 py-2.5 text-sm">
              <b>Kamu:</b> {issue.myFeeling}
            </p>
          )}
          {issue.partnerFeeling && (
            <p className="rounded-[14px] bg-sand-soft px-3.5 py-2.5 text-sm">
              <b>{partnerName}:</b> {issue.partnerFeeling}
            </p>
          )}
          {issue.needsMyResponse && (
            <>
              <p className="text-sm text-muted">
                {partnerName} ingin membahas ini. Tulis sisi ceritamu dulu; cerita {partnerName} akan terbuka setelah kamu menulis.
              </p>
              <RespondForm issueId={issue.id} />
            </>
          )}
          {issue.status === "waiting" && issue.mine && (
            <p className="text-sm text-muted">Menunggu {partnerName} menulis sisi ceritanya.</p>
          )}
          {issue.status === "discussing" && <ResolveForm issueId={issue.id} />}
        </div>
      )}
    </article>
  );
}
