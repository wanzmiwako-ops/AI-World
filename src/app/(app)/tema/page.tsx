import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, PageHeader, PageSkeleton } from "@/components/ui";
import { requireCouple } from "@/lib/dal";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Tema Dunia" };

async function Picker() {
  const viewer = await requireCouple();
  return <ThemePicker initial={viewer.couple.theme ?? "ocean"} partnerName={viewer.partner?.display_name ?? "pasanganmu"} />;
}

export default function TemaPage() {
  return (
    <Page>
      <PageHeader title="Tema dunia kita" subtitle="Satu tema untuk berdua, berubah langsung di HP pasanganmu" back="/" />
      <Suspense fallback={<PageSkeleton />}>
        <Picker />
      </Suspense>
    </Page>
  );
}
