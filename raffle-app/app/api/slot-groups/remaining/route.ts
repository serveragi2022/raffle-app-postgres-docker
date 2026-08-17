import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/services/events";
import { queryOne } from "@/lib/db";

export async function GET() {
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ remaining: 0 });
    // Lightweight aggregate query instead of pulling every group/winner/
    // participant row just to sum a number (this endpoint is polled).
    const row = await queryOne<{ remaining: number }>(
      `select coalesce(sum(greatest(sg.slot_limit - coalesce(w.won, 0), 0)), 0)::int as remaining
       from slot_groups sg
       left join (
         select slot_group_id, count(*) as won from winners where raffle_event_id = $1 group by slot_group_id
       ) w on w.slot_group_id = sg.id
       where sg.raffle_event_id = $1`,
      [event.id]
    );
    return NextResponse.json({ remaining: row?.remaining ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
