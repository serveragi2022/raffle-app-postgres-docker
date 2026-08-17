import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { skipDraw } from "@/lib/services/raffle";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slotGroupId } = (await request.json()) as { slotGroupId: string };
  if (!slotGroupId) return NextResponse.json({ error: "slotGroupId is required." }, { status: 400 });

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });
    await skipDraw(event.id, slotGroupId, session.sub);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
