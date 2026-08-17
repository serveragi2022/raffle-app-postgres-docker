import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { clearParticipants } from "@/lib/services/participantsAdmin";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });
    await clearParticipants(event.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
