import { query } from "@/lib/db";
import { findOrCreateDepartment } from "@/lib/services/departments";
import type { ParsedCsvRow, ImportRowResult, ImportSummary } from "@/lib/services/csv";

export type { ParsedCsvRow, ImportRowResult, ImportSummary } from "@/lib/services/csv";
export { normalizeCsvRows } from "@/lib/services/csv";

/**
 * Bulk-imports participants for a raffle event.
 *   * Auto-creates departments that don't exist yet.
 *   * Flags rows missing a name or department as errors (not imported).
 *   * Flags rows that already exist (same name + department in this event)
 *     as duplicates (not re-imported, but not a failure either).
 */
export async function importParticipants(
  raffleEventId: string,
  rows: ParsedCsvRow[]
): Promise<ImportSummary> {
  const results: ImportRowResult[] = [];
  const departmentCache = new Map<string, string>(); // name(lower) -> department_id

  const { rows: existingParticipants } = await query<{ employee_name: string; department_id: string }>(
    `select employee_name, department_id from participants where raffle_event_id = $1`,
    [raffleEventId]
  );

  const existingKey = new Set(
    existingParticipants.map((p) => `${p.employee_name.toLowerCase()}::${p.department_id}`)
  );

  const toInsert: { employee_name: string; department_id: string; row: number }[] = [];

  for (const row of rows) {
    if (!row.employeeName) {
      results.push({ ...row, status: "error", message: "Missing 'Employee Name' value." });
      continue;
    }
    if (!row.department) {
      results.push({ ...row, status: "error", message: "Missing 'Department' value." });
      continue;
    }

    const cached = departmentCache.get(row.department.toLowerCase());
    let departmentId: string;
    if (cached) {
      departmentId = cached;
    } else {
      try {
        const dept: any = await findOrCreateDepartment(raffleEventId, row.department);
        departmentId = dept.id;
        departmentCache.set(row.department.toLowerCase(), departmentId);
      } catch (e: any) {
        results.push({ ...row, status: "error", message: e.message ?? "Could not resolve department." });
        continue;
      }
    }

    const key = `${row.employeeName.toLowerCase()}::${departmentId}`;
    if (existingKey.has(key)) {
      results.push({ ...row, status: "duplicate", message: "Already imported for this department." });
      continue;
    }

    existingKey.add(key); // prevent duplicate rows within the same file too
    toInsert.push({ employee_name: row.employeeName, department_id: departmentId, row: row.row });
    results.push({ ...row, status: "valid" });
  }

  if (toInsert.length > 0) {
    // Batch insert via multi-row INSERT statements, chunked to stay well
    // under Postgres' ~65535 bound-parameter limit per query.
    const CHUNK = 2000;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const values: string[] = [];
      const params: unknown[] = [];
      chunk.forEach((r, j) => {
        const base = j * 3;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        params.push(raffleEventId, r.department_id, r.employee_name);
      });
      await query(
        `insert into participants (raffle_event_id, department_id, employee_name) values ${values.join(", ")}`,
        params
      );
    }
  }

  return {
    totalRows: rows.length,
    imported: toInsert.length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}

export async function listParticipants(raffleEventId: string) {
  const { rows } = await query(
    `select p.*, json_build_object('department_name', d.department_name) as departments
     from participants p
     join departments d on d.id = p.department_id
     where p.raffle_event_id = $1
     order by p.employee_name`,
    [raffleEventId]
  );
  return rows;
}
