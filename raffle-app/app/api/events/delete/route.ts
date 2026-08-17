import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteEventAndData, archiveEvent, deleteAllData } from "@/lib/services/eventsAdmin";
import { resetRaffle } from "@/lib/services/raffle";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const raw = await req.text();
    let body: any = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }

    let eventId: string | undefined;
    let action: string | undefined;
    if (typeof body === "string") {
      const s = body.replace(/^"|"$/g, "").trim();
      action = s || undefined;
    } else if (body && typeof body === "object") {
      eventId = body.eventId;
      action = body.action;
    }

    if (!action && !eventId) {
      return NextResponse.json({ error: "Missing action or eventId", receivedBody: body }, { status: 400 });
    }

    if (action === "delete_all") {
      await deleteAllData();
      return NextResponse.json({ ok: true });
    }

    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    if (action === "archive") {
      await archiveEvent(eventId);
      return NextResponse.json({ ok: true });
    }

    if (action === "reset") {
      await resetRaffle(eventId, session.sub);
      return NextResponse.json({ ok: true });
    }

    await deleteEventAndData(eventId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
