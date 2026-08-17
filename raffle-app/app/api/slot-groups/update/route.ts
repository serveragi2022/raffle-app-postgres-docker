import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateSlotGroup } from "@/lib/services/slotGroups";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { slotGroupId, ...params } = (await req.json()) as {
      slotGroupId: string;
      groupName?: string;
      slotLimit?: number;
      departmentIds?: string[];
      appliesToAll?: boolean;
    };
    if (!slotGroupId) return NextResponse.json({ error: "Missing slotGroupId." }, { status: 400 });
    await updateSlotGroup(slotGroupId, params);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 400 });
  }
}
