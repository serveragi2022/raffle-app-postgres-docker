import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db";

type Body = { eventId?: string; status?: "draft" | "in_progress" | "completed" | "archived" };

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body: Body = await req.json();
    const { eventId, status } = body;
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    if (status === "in_progress") {
      const existing = await queryOne(
        `select id from raffle_events where status = 'in_progress' and id <> $1 limit 1`,
        [eventId]
      );
      if (existing) {
        return NextResponse.json({ error: "Another event is already in_progress" }, { status: 400 });
      }
    }

    const { rows } = await query(`update raffle_events set status = $2 where id = $1 returning *`, [
      eventId,
      status,
    ]);
    if (rows.length === 0) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
