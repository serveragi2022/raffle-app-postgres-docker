import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { importParticipants, type ParsedCsvRow } from "@/lib/services/participants";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { rows: ParsedCsvRow[] };
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }
  if (body.rows.length > 20000) {
    return NextResponse.json({ error: "File too large — max 20,000 rows per import." }, { status: 400 });
  }

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });
    const summary = await importParticipants(event.id, body.rows);
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Import failed." }, { status: 500 });
  }
}
