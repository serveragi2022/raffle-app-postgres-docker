import { query, queryOne } from "@/lib/db";

export interface DepartmentRow {
  id: string;
  raffle_event_id: string;
  department_name: string;
  created_at: string;
  participant_count: number;
}

export async function listDepartments(raffleEventId: string): Promise<DepartmentRow[]> {
  const { rows } = await query<DepartmentRow>(
    `select d.*, count(p.id)::int as participant_count
     from departments d
     left join participants p on p.department_id = d.id
     where d.raffle_event_id = $1
     group by d.id
     order by d.department_name`,
    [raffleEventId]
  );
  return rows;
}

export async function createDepartment(raffleEventId: string, departmentName: string) {
  return queryOne(
    `insert into departments (raffle_event_id, department_name) values ($1, $2) returning *`,
    [raffleEventId, departmentName.trim()]
  );
}

export async function renameDepartment(departmentId: string, departmentName: string) {
  const row = await queryOne(
    `update departments set department_name = $2 where id = $1 returning *`,
    [departmentId, departmentName.trim()]
  );
  if (!row) throw new Error("Department not found.");
  return row;
}

export async function deleteDepartment(departmentId: string) {
  await query(`delete from departments where id = $1`, [departmentId]);
}

/** Finds an existing department by (case-insensitive) name, or creates it. Used by CSV import. */
export async function findOrCreateDepartment(raffleEventId: string, departmentName: string) {
  const trimmed = departmentName.trim();
  const existing = await queryOne(
    `select * from departments where raffle_event_id = $1 and lower(department_name) = lower($2)`,
    [raffleEventId, trimmed]
  );
  if (existing) return existing;
  return createDepartment(raffleEventId, trimmed);
}
