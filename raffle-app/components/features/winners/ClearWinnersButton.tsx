"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useState } from "react";

export function ClearWinnersButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    if (!confirm("Clear all drawn winners for this event? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/raffle/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to clear winners.");
      router.refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClear} loading={busy}>
      <Star size={14} /> Clear Winners
    </Button>
  );
}
