import type { AnimationSpeed } from "@/lib/types/database.types";

export async function updateSettings(
  _unused: unknown,
  raffleEventId: string,
  patch: Partial<{
    dark_mode: boolean;
    animation_speed: AnimationSpeed;
    spin_duration_ms: number;
    sound_enabled: boolean;
    confetti_enabled: boolean;
    company_logo_url: string | null;
  }>
) {
  const res = await fetch("/api/settings/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raffleEventId, ...patch }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to save settings.");
  return json;
}
