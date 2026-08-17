import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/services/events";
import { listWinners } from "@/lib/services/winners";

export async function GET() {
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json([]);
    const winners = await listWinners(event.id);
    const recent = (winners ?? []).slice(0, 5);
    return NextResponse.json(recent);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
