import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { LiveBridge } from "@/components/live/live-bridge";
import { getViewer } from "@/lib/dal";

/** Koneksi realtime dipasang sekali untuk seluruh aplikasi (tidak menahan tampilan halaman). */
async function Live() {
  const viewer = await getViewer();
  if (!viewer.couple) return null;
  return (
    <LiveBridge
      coupleId={viewer.couple.id}
      me={{ id: viewer.userId, name: viewer.profile.display_name, avatar: viewer.profile.avatar_url }}
      partner={viewer.partner ? { id: viewer.partner.id, name: viewer.partner.display_name, avatar: viewer.partner.avatar_url } : null}
      initialUnread={viewer.unread}
      pinEnabled={viewer.pinEnabled}
    />
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      <Suspense fallback={null}>
        <Live />
      </Suspense>
    </AppShell>
  );
}
