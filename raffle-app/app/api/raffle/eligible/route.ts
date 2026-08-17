import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { listEligibleParticipants, RaffleEngineError } from "@/lib/services/raffle";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slotGroupId } = (await request.json()) as { slotGroupId: string };
  if (!slotGroupId) return NextResponse.json({ error: "slotGroupId is required." }, { status: 400 });

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });
    const participants = await listEligibleParticipants(event.id, slotGroupId);
    return NextResponse.json(participants);
  } catch (e) {
    const err = e as RaffleEngineError;
    const status = err.code === "NO_ELIGIBLE_PARTICIPANTS" ? 409 : 500;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
}
