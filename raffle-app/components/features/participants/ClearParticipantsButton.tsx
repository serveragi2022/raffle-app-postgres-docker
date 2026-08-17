"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function ClearParticipantsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    if (!confirm("Delete all participants for this event? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/participants/clear", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to clear participants.");
      router.refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClear} loading={busy}>
      <Trash2 size={14} /> Clear Participants
    </Button>
  );
}
