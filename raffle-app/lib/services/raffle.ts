import { query } from "@/lib/db";

export interface DrawResult {
  winner_id: string;
  participant_id: string;
  employee_name: string;
  department_id: string;
  department_name: string;
  slot_group_id: string;
  group_name: string;
  drawn_at: string;
}

/**
 * All mutations go through Postgres functions (see db/init.sql, ported
 * unchanged from supabase/migrations/0002_raffle_engine.sql) so the
 * eligibility check and the winner insert happen atomically inside one
 * transaction with an advisory lock — this is what prevents two
 * simultaneous draws from both landing in the same, now-over-filled, slot
 * group.
 */
export class RaffleEngineError extends Error {
  code: "NO_ELIGIBLE_PARTICIPANTS" | "NO_WINNER_TO_REDRAW" | "UNKNOWN";
  constructor(message: string, code: "NO_ELIGIBLE_PARTICIPANTS" | "NO_WINNER_TO_REDRAW" | "UNKNOWN") {
    super(message);
    this.code = code;
  }
}

function toEngineError(err: { message?: string }): RaffleEngineError {
  if (err.message?.includes("NO_ELIGIBLE_PARTICIPANTS")) {
    return new RaffleEngineError("No eligible participants remain.", "NO_ELIGIBLE_PARTICIPANTS");
  }
  if (err.message?.includes("NO_WINNER_TO_REDRAW")) {
    return new RaffleEngineError("There is no winner to redraw.", "NO_WINNER_TO_REDRAW");
  }
  return new RaffleEngineError(err.message ?? "Unknown raffle engine error", "UNKNOWN");
}

export async function drawWinner(
  raffleEventId: string,
  slotGroupId: string,
  performedBy: string | null
): Promise<DrawResult> {
  try {
    const { rows } = await query<DrawResult>(`select * from draw_winner($1, $2, $3)`, [
      raffleEventId,
      slotGroupId,
      performedBy,
    ]);
    return rows[0];
  } catch (err: any) {
    throw toEngineError(err);
  }
}

/**
 * Draws a winner from a uniformly-random slot group among those that still
 * have open capacity and eligible participants — the group choice is made
 * entirely inside Postgres (see draw_random_slot() in db/init.sql), so
 * there's no client-side "try this group, fall back to that group" loop
 * that could bias toward a deterministic order.
 */
export async function drawRandomSlot(raffleEventId: string, performedBy: string | null): Promise<DrawResult> {
  try {
    const { rows } = await query<DrawResult>(`select * from draw_random_slot($1, $2)`, [
      raffleEventId,
      performedBy,
    ]);
    return rows[0];
  } catch (err: any) {
    throw toEngineError(err);
  }
}

export async function redrawWinner(
  raffleEventId: string,
  slotGroupId: string,
  performedBy: string | null
): Promise<DrawResult> {
  try {
    const { rows } = await query<DrawResult>(`select * from redraw_winner($1, $2, $3)`, [
      raffleEventId,
      slotGroupId,
      performedBy,
    ]);
    return rows[0];
  } catch (err: any) {
    throw toEngineError(err);
  }
}

export async function skipDraw(raffleEventId: string, slotGroupId: string, performedBy: string | null): Promise<void> {
  try {
    await query(`select skip_draw($1, $2, $3)`, [raffleEventId, slotGroupId, performedBy]);
  } catch (err: any) {
    throw toEngineError(err);
  }
}

export async function resetRaffle(raffleEventId: string, performedBy: string | null): Promise<void> {
  try {
    await query(`select reset_raffle($1, $2)`, [raffleEventId, performedBy]);
  } catch (err: any) {
    throw toEngineError(err);
  }
}

export async function listEligibleParticipants(raffleEventId: string, slotGroupId: string) {
  try {
    const { rows } = await query<{
      participant_id: string;
      employee_name: string;
      department_id: string;
      department_name: string;
    }>(`select * from eligible_participants($1, $2)`, [raffleEventId, slotGroupId]);
    return rows;
  } catch (err: any) {
    throw toEngineError(err);
  }
}

export async function getEligibleCount(raffleEventId: string, slotGroupId: string): Promise<number> {
  try {
    const { rows } = await query(`select count(*)::int as count from eligible_participants($1, $2) x`, [
      raffleEventId,
      slotGroupId,
    ]);
    return (rows[0] as any)?.count ?? 0;
  } catch (err: any) {
    throw toEngineError(err);
  }
}