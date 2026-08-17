import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDepartment } from "@/lib/services/departments";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { raffleEventId, name } = (await req.json()) as { raffleEventId?: string; name?: string };
    if (!raffleEventId || !name) return NextResponse.json({ error: "Missing raffleEventId or name." }, { status: 400 });
    const dept = await createDepartment(raffleEventId, name);
    return NextResponse.json(dept);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
