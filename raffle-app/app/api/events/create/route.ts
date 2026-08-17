import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db";

type Body = { title?: string; status?: "draft" | "in_progress" | "completed" | "archived" };

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body: Body = await req.json();
    const title = body.title?.trim() || "New Event";
    const status = body.status ?? "draft";

    if (status === "in_progress") {
      const existing = await queryOne(`select id from raffle_events where status = 'in_progress' limit 1`);
      if (existing) {
        return NextResponse.json({ error: "There is already an active in_progress event" }, { status: 400 });
      }
    }

    const { rows } = await query(
      `insert into raffle_events (title, status) values ($1, $2) returning *`,
      [title, status]
    );
    return NextResponse.json(rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
