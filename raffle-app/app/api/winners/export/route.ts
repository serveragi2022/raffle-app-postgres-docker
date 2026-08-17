import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth/session";
import { getActiveEvent } from "@/lib/services/events";
import { listWinners, winnersToCsv } from "@/lib/services/winners";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ error: "No active event." }, { status: 400 });
    const winners = await listWinners(event.id);

    if (format === "csv") {
      const csv = winnersToCsv(winners);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="winners.csv"`,
        },
      });
    }

    const sheet = XLSX.utils.json_to_sheet(
      winners.map((w) => ({
        "Employee Name": w.employee_name,
        Department: w.department_name,
        "Slot Group": w.group_name,
        Date: new Date(w.drawn_at).toLocaleDateString(),
        Time: new Date(w.drawn_at).toLocaleTimeString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Winners");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="winners.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
