import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { renameDepartment } from "@/lib/services/departments";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { departmentId, name } = (await req.json()) as { departmentId?: string; name?: string };
    if (!departmentId || !name) return NextResponse.json({ error: "Missing departmentId or name." }, { status: 400 });
    const dept = await renameDepartment(departmentId, name);
    return NextResponse.json(dept);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
