import { query } from "@/lib/db";

export interface WinnerRow {
  id: string;
  employee_name: string;
  department_name: string;
  group_name: string;
  drawn_at: string;
}

export async function listWinners(
  raffleEventId: string,
  opts?: { search?: string; departmentId?: string; slotGroupId?: string }
): Promise<WinnerRow[]> {
  const conditions = [`w.raffle_event_id = $1`];
  const params: unknown[] = [raffleEventId];

  if (opts?.departmentId) {
    params.push(opts.departmentId);
    conditions.push(`w.department_id = $${params.length}`);
  }
  if (opts?.slotGroupId) {
    params.push(opts.slotGroupId);
    conditions.push(`w.slot_group_id = $${params.length}`);
  }

  const { rows } = await query<WinnerRow>(
    `select w.id, w.drawn_at, p.employee_name, d.department_name, sg.group_name
     from winners w
     join participants p on p.id = w.participant_id
     join departments d on d.id = w.department_id
     join slot_groups sg on sg.id = w.slot_group_id
     where ${conditions.join(" and ")}
     order by w.drawn_at desc`,
    params
  );

  let result = rows;
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(
      (r) => r.employee_name.toLowerCase().includes(q) || r.department_name.toLowerCase().includes(q)
    );
  }

  return result;
}

export function winnersToCsv(rows: WinnerRow[]): string {
  const header = ["Employee Name", "Department", "Slot Group", "Date", "Time"];
  const lines = rows.map((r) => {
    const d = new Date(r.drawn_at);
    return [
      csvEscape(r.employee_name),
      csvEscape(r.department_name),
      csvEscape(r.group_name),
      d.toLocaleDateString(),
      d.toLocaleTimeString(),
    ].join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
