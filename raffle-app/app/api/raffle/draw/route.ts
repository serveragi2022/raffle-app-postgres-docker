import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { drawWinner, drawRandomSlot, RaffleEngineError } from "@/lib/services/raffle";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { slotGroupId?: string };

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });

    // No slotGroupId: let the DB pick uniformly at random among groups that
    // still have open capacity + eligible participants (the normal "Start
    // Draw" path). A specific slotGroupId is still supported for any
    // admin flow that intentionally targets one group.
    const winner = body.slotGroupId
      ? await drawWinner(event.id, body.slotGroupId, session.sub)
      : await drawRandomSlot(event.id, session.sub);

    return NextResponse.json(winner);
  } catch (e) {
    const err = e as RaffleEngineError;
    const status = err.code === "NO_ELIGIBLE_PARTICIPANTS" ? 409 : 500;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
}