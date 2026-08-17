import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateSettings } from "@/lib/services/settings.server";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { raffleEventId, ...patch } = (await req.json()) as { raffleEventId: string } & Record<string, unknown>;
    if (!raffleEventId) return NextResponse.json({ error: "Missing raffleEventId." }, { status: 400 });
    const updated = await updateSettings(raffleEventId, patch as any);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
