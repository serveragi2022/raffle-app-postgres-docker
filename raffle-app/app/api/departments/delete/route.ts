import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteDepartment } from "@/lib/services/departments";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { departmentId } = (await req.json()) as { departmentId?: string };
    if (!departmentId) return NextResponse.json({ error: "Missing departmentId." }, { status: 400 });
    await deleteDepartment(departmentId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
