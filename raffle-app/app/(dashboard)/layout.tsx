import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getActiveEvent } from "@/lib/services/events";
import { getSettings } from "@/lib/services/settings.server";
import { getUserRole } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const event = await getActiveEvent();
  let settings;
  if (event) {
    settings = await getSettings(event.id);
  } else {
    settings = {
      raffle_event_id: null,
      dark_mode: false,
      animation_speed: "normal",
      spin_duration_ms: 4000,
      sound_enabled: true,
      confetti_enabled: true,
      company_logo_url: null,
      updated_at: new Date().toISOString(),
    } as any;
  }

  const userRole = (await getUserRole()) ?? "viewer";

  return (
    <div className={settings.dark_mode ? "dark" : ""}>
      <div className="flex min-h-screen bg-background">
        <Sidebar eventStatus={event?.status} role={userRole} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Topbar />
          <main className="flex-1 min-h-0 px-4 md:px-5 py-3 max-w-container-max w-full mx-auto overflow-visible">{children}</main>
        </div>
      </div>
    </div>
  );
}
