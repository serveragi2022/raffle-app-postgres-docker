"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Building2,
  Ticket,
  Trophy,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AppUserRole } from "@/lib/services/auth";

const MAIN_NAV = [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }];
const GROUP_NAV = [
  { href: "/participants", label: "Participants", icon: Users },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/slot-management", label: "Slot Groups", icon: Building2 },
];
const ACTION_NAV = [
  { href: "/raffle", label: "Raffle", icon: Ticket },
  { href: "/winners", label: "Winners", icon: Trophy },
];

export function Sidebar({ eventStatus, role }: { eventStatus?: string; role?: AppUserRole }) {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] shrink-0 border-r border-outline-variant/60 bg-surface-container-lowest flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-10 h-10 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-title-lg">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p className="text-title-lg text-on-surface leading-tight">RaffleAdmin</p>
          <p className="text-label-md text-on-surface-variant">Raffle Administration</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-4">
        {role !== "viewer" && (
          <div>
            {MAIN_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-body-md font-medium transition-colors",
                    active
                      ? "bg-primary-fixed text-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {role !== "viewer" && (
          <div>
            <p className="text-label-sm uppercase text-on-surface-variant tracking-[0.16em] px-3 mb-2">Group setup</p>
            {GROUP_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-body-md font-medium transition-colors",
                    active
                      ? "bg-primary-fixed text-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <div>
          <p className="text-label-sm uppercase text-on-surface-variant tracking-[0.16em] px-3 mb-2">Live raffle</p>
          {ACTION_NAV.filter((item) =>
            role === "viewer" ? ["/raffle", "/winners"].includes(item.href) : true
          ).map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-body-md font-medium transition-colors",
                  active
                    ? "bg-primary-fixed text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-3 pb-6">
        <Link
          href="/events"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded text-body-md font-medium transition-colors",
            pathname.startsWith("/events")
              ? "bg-primary-fixed text-primary font-semibold"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          )}
        >
          <Building2 size={18} />
          Events
        </Link>
      </div>

      {role !== "viewer" && (
        <div className="px-3 pb-6">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded text-body-md font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-primary-fixed text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            )}
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      )}
    </aside>
  );
}
