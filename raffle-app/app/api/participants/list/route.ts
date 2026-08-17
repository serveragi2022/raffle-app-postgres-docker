import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { listParticipants } from "@/lib/services/participants";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json([]);
    const participants = await listParticipants(event.id);
    return NextResponse.json((participants as any[]).map((p) => ({ id: p.id, employee_name: p.employee_name })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
