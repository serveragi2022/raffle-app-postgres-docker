import { query, queryOne } from "@/lib/db";
import type { AnimationSpeed } from "@/lib/types/database.types";

export interface RaffleSettingsRow {
  raffle_event_id: string;
  dark_mode: boolean;
  animation_speed: AnimationSpeed;
  spin_duration_ms: number;
  sound_enabled: boolean;
  confetti_enabled: boolean;
  company_logo_url: string | null;
  updated_at: string;
}

export async function getSettings(raffleEventId: string): Promise<RaffleSettingsRow> {
  const existing = await queryOne<RaffleSettingsRow>(
    `select * from raffle_settings where raffle_event_id = $1`,
    [raffleEventId]
  );
  if (existing) return existing;

  // Insert defaults; handle a concurrent-creation race via ON CONFLICT.
  const created = await queryOne<RaffleSettingsRow>(
    `insert into raffle_settings (raffle_event_id) values ($1)
     on conflict (raffle_event_id) do update set raffle_event_id = excluded.raffle_event_id
     returning *`,
    [raffleEventId]
  );
  return created as RaffleSettingsRow;
}

export async function updateSettings(
  raffleEventId: string,
  patch: Partial<{
    dark_mode: boolean;
    animation_speed: AnimationSpeed;
    spin_duration_ms: number;
    sound_enabled: boolean;
    confetti_enabled: boolean;
    company_logo_url: string | null;
  }>
): Promise<RaffleSettingsRow> {
  // Ensure a row exists first (mirrors getSettings' upsert-on-read behavior).
  await getSettings(raffleEventId);

  const fields = Object.keys(patch);
  if (fields.length === 0) {
    return (await queryOne<RaffleSettingsRow>(`select * from raffle_settings where raffle_event_id = $1`, [
      raffleEventId,
    ])) as RaffleSettingsRow;
  }

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`);
  setClauses.push(`updated_at = now()`);
  const params = [raffleEventId, ...fields.map((f) => (patch as any)[f])];

  const row = await queryOne<RaffleSettingsRow>(
    `update raffle_settings set ${setClauses.join(", ")} where raffle_event_id = $1 returning *`,
    params
  );
  return row as RaffleSettingsRow;
}
