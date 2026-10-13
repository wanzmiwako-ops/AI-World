import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui";
import { IdeasView } from "./ideas-view";

export const metadata: Metadata = { title: "Ide Kencan" };

export default function IdePage() {
  return (
    <Page>
      <PageHeader title="Mau ngapain?" subtitle="Ide kencan biar nggak bingung" back="/" />
      <IdeasView />
    </Page>
  );
}
