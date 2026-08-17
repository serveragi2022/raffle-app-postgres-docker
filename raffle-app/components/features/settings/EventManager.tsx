"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash, Archive, RefreshCw } from "lucide-react";
import { useState } from "react";

export function EventManager({ raffleEventId, title }: { raffleEventId: string; title?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function doAction(action: "delete" | "archive" | "reset" | "delete_all") {
    if (action === "delete") {
      if (!confirm(`Delete event "${title ?? raffleEventId}" and all related data? This cannot be undone.`)) return;
    }
    if (action === "delete_all") {
      const confirmation = prompt(
        "Type DELETE ALL to permanently remove ALL raffle-related data from the database. This cannot be undone."
      );
      if (confirmation !== "DELETE ALL") return;
    }
    if (action === "reset") {
      if (!confirm("Clear all drawn winners for this event? This cannot be undone.")) return;
    }

    setBusy(true);
    try {
      if (action === "reset") {
        const res = await fetch("/api/raffle/reset", { method: "POST", credentials: "same-origin" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to reset raffle");
      } else {
        const payload: any = action === "delete_all" ? { action: "delete_all" } : { eventId: raffleEventId, action };
        const res = await fetch("/api/events/delete", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to perform event action");
      }

      router.refresh();
      alert("Action completed.");
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-x-2">
      <Button variant="destructive" size="sm" onClick={() => doAction("delete_all")} disabled={busy}>
        <Trash size={14} /> Clear All Data
      </Button>
    </div>
  );
}
