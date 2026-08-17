import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createSlotGroup } from "@/lib/services/slotGroups";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await req.json()) as {
      raffleEventId: string;
      groupName: string;
      slotLimit: number;
      departmentIds: string[];
      appliesToAll?: boolean;
    };
    const group = await createSlotGroup(body);
    return NextResponse.json(group);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 400 });
  }
}
