import { query } from "@/lib/db";

export async function clearParticipants(raffleEventId: string) {
  await query(`delete from participants where raffle_event_id = $1`, [raffleEventId]);
}
