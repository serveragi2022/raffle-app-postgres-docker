import { query, queryOne, withTransaction } from "@/lib/db";

export interface SlotGroupWithDetails {
  id: string;
  raffle_event_id: string;
  group_name: string;
  slot_limit: number;
  is_all: boolean;
  applies_to_all: boolean;
  created_at: string;
  department_ids: string[];
  department_names: string[];
  participant_count: number;
  winners_drawn: number;
}

/**
 * Lists slot groups with their mapped departments, participant totals, and
 * winners drawn so far — everything the Slot Management screen needs, in a
 * small fixed number of queries (not one query per group).
 */
export async function listSlotGroups(raffleEventId: string): Promise<SlotGroupWithDetails[]> {
  const { rows: groups } = await query<any>(
    `select id, raffle_event_id, group_name, slot_limit, is_all, applies_to_all, created_at
     from slot_groups
     where raffle_event_id = $1
     order by is_all desc, group_name`,
    [raffleEventId]
  );

  const { rows: winnerCounts } = await query<{ slot_group_id: string; count: number }>(
    `select slot_group_id, count(*)::int as count from winners where raffle_event_id = $1 group by slot_group_id`,
    [raffleEventId]
  );
  const winnerTally = new Map<string, number>();
  winnerCounts.forEach((w) => winnerTally.set(w.slot_group_id, w.count));

  const { rows: mappings } = await query<{ slot_group_id: string; department_id: string; department_name: string }>(
    `select sgd.slot_group_id, sgd.department_id, d.department_name
     from slot_group_departments sgd
     join departments d on d.id = sgd.department_id
     where sgd.slot_group_id in (select id from slot_groups where raffle_event_id = $1)`,
    [raffleEventId]
  );
  const mappingsByGroup = new Map<string, { department_id: string; department_name: string }[]>();
  mappings.forEach((m) => {
    const list = mappingsByGroup.get(m.slot_group_id) ?? [];
    list.push({ department_id: m.department_id, department_name: m.department_name });
    mappingsByGroup.set(m.slot_group_id, list);
  });

  const { rows: allParticipants } = await query<{ id: string; department_id: string }>(
    `select id, department_id from participants where raffle_event_id = $1`,
    [raffleEventId]
  );

  return groups.map((g: any) => {
    const spansAll = g.is_all || g.applies_to_all;
    const mapped = mappingsByGroup.get(g.id) ?? [];

    const departmentIds: string[] = spansAll
      ? Array.from(new Set(allParticipants.map((p) => p.department_id)))
      : mapped.map((m) => m.department_id);

    const departmentNames: string[] = spansAll
      ? ["All Departments"]
      : mapped.map((m) => m.department_name);

    const participantCount = spansAll
      ? allParticipants.length
      : allParticipants.filter((p) => departmentIds.includes(p.department_id)).length;

    return {
      id: g.id,
      raffle_event_id: g.raffle_event_id,
      group_name: g.group_name,
      slot_limit: g.slot_limit,
      is_all: g.is_all,
      applies_to_all: g.applies_to_all,
      created_at: g.created_at,
      department_ids: departmentIds,
      department_names: departmentNames,
      participant_count: participantCount,
      winners_drawn: winnerTally.get(g.id) ?? 0,
    };
  });
}

/** Departments not yet claimed by any custom (non-ALL) slot group. */
export async function listUnassignedDepartments(raffleEventId: string) {
  const { rows: departments } = await query<{ id: string; department_name: string }>(
    `select id, department_name from departments where raffle_event_id = $1`,
    [raffleEventId]
  );
  const { rows: assigned } = await query<{ department_id: string }>(
    `select sgd.department_id
     from slot_group_departments sgd
     join slot_groups sg on sg.id = sgd.slot_group_id
     where sg.raffle_event_id = $1`,
    [raffleEventId]
  );
  const assignedIds = new Set(assigned.map((a) => a.department_id));
  return departments.filter((d) => !assignedIds.has(d.id));
}

export async function createSlotGroup(params: {
  raffleEventId: string;
  groupName: string;
  slotLimit: number;
  departmentIds: string[];
  appliesToAll?: boolean;
}) {
  if (params.slotLimit <= 0) {
    throw new Error("Slot limit must be greater than zero.");
  }

  const totalParticipants = await getTotalParticipants(params.raffleEventId);
  if (params.slotLimit > totalParticipants) {
    throw new Error("Slot limit cannot exceed the total number of participants.");
  }

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `insert into slot_groups (raffle_event_id, group_name, slot_limit, is_all, applies_to_all)
       values ($1, $2, $3, false, $4) returning *`,
      [params.raffleEventId, params.groupName.trim(), params.slotLimit, !!params.appliesToAll]
    );
    const group = rows[0];

    if (!params.appliesToAll && params.departmentIds.length > 0) {
      try {
        const values = params.departmentIds.map((_, i) => `($1, $${i + 2})`).join(", ");
        await client.query(
          `insert into slot_group_departments (slot_group_id, department_id) values ${values}`,
          [group.id, ...params.departmentIds]
        );
      } catch (mapError: any) {
        if (String(mapError.message ?? "").includes("uq_sgd_department_once")) {
          throw new Error("One or more departments already belong to another slot group.");
        }
        throw mapError;
      }
    }

    return group;
  });
}

export async function updateSlotGroup(
  slotGroupId: string,
  params: {
    groupName?: string;
    slotLimit?: number;
    departmentIds?: string[];
    appliesToAll?: boolean;
  }
) {
  const setClauses: string[] = [];
  const setParams: unknown[] = [];
  if (params.groupName !== undefined) {
    setParams.push(params.groupName.trim());
    setClauses.push(`group_name = $${setParams.length}`);
  }
  if (params.slotLimit !== undefined) {
    if (params.slotLimit <= 0) throw new Error("Slot limit must be greater than zero.");
    setParams.push(params.slotLimit);
    setClauses.push(`slot_limit = $${setParams.length}`);
  }
  if (params.appliesToAll !== undefined) {
    setParams.push(params.appliesToAll);
    setClauses.push(`applies_to_all = $${setParams.length}`);
  }

  await withTransaction(async (client) => {
    if (setClauses.length > 0) {
      setParams.push(slotGroupId);
      await client.query(
        `update slot_groups set ${setClauses.join(", ")} where id = $${setParams.length}`,
        setParams
      );
    }

    if (params.departmentIds !== undefined) {
      await client.query(`delete from slot_group_departments where slot_group_id = $1`, [slotGroupId]);
      if (!params.appliesToAll && params.departmentIds.length > 0) {
        try {
          const values = params.departmentIds.map((_, i) => `($1, $${i + 2})`).join(", ");
          await client.query(
            `insert into slot_group_departments (slot_group_id, department_id) values ${values}`,
            [slotGroupId, ...params.departmentIds]
          );
        } catch (mapError: any) {
          if (String(mapError.message ?? "").includes("uq_sgd_department_once")) {
            throw new Error("One or more departments already belong to another slot group.");
          }
          throw mapError;
        }
      }
    }
  });
}

export async function deleteSlotGroup(slotGroupId: string) {
  await query(`delete from slot_groups where id = $1`, [slotGroupId]);
}

/** Ensures every raffle event has exactly one ALL slot group. Call after event creation. */
export async function ensureAllSlotGroup(raffleEventId: string, defaultSlotLimit: number) {
  const existing = await queryOne(`select id from slot_groups where raffle_event_id = $1 and is_all = true`, [
    raffleEventId,
  ]);
  if (existing) return existing;

  const slotLimit = Math.max(1, defaultSlotLimit);
  return queryOne(
    `insert into slot_groups (raffle_event_id, group_name, slot_limit, is_all)
     values ($1, 'ALL', $2, true) returning *`,
    [raffleEventId, slotLimit]
  );
}

async function getTotalParticipants(raffleEventId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `select count(*)::int as count from participants where raffle_event_id = $1`,
    [raffleEventId]
  );
  return row?.count ?? 0;
}
