"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, HelpCircle, LogOut } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  participants: "Participants",
  departments: "Departments",
  "slot-management": "Slot Groups",
  raffle: "Raffle",
  winners: "Winners",
  settings: "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const label = LABELS[segment] ?? segment;

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-outline-variant/60 bg-surface-container-lowest flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
        <span>Home</span>
        <span>/</span>
        <span className="text-on-surface font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-5">
        <button
          onClick={handleSignOut}
          className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center hover:bg-primary-fixed-dim transition"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
