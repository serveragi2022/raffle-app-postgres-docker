import { queryOne } from "@/lib/db";

export interface RaffleEventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  status: "draft" | "in_progress" | "completed" | "archived";
  created_at: string;
}

/**
 * The UI works against a single active raffle event at a time rather than a
 * picker. This fetches the most recently created event matching the "active"
 * status.
 *
 * NOTE: kept identical to the original Supabase implementation, including
 * its existing quirk of filtering on status = 'draft' (despite the comment
 * saying 'in_progress') — not touched here since this pass is a straight
 * infra migration, not a behavior change.
 */
export async function getActiveEvent(): Promise<RaffleEventRow | null> {
  const active = await queryOne<RaffleEventRow>(
    `select * from raffle_events where status = 'draft' order by created_at desc limit 1`
  );
  return active ?? null;
}

export async function getEventById(eventId: string): Promise<RaffleEventRow | null> {
  return queryOne<RaffleEventRow>(`select * from raffle_events where id = $1`, [eventId]);
}
