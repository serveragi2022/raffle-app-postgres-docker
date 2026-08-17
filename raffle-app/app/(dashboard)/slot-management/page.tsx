import { getActiveEvent } from "@/lib/services/events";
import { listSlotGroups } from "@/lib/services/slotGroups";
import { query, queryOne } from "@/lib/db";
import { SlotGroupsManager } from "@/components/features/slot-management/SlotGroupsManager";

export default async function SlotManagementPage() {
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Slot Groups</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  if (event.status === "in_progress") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Slot Groups</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Slot group configuration is disabled while the raffle is live.
          </p>
        </div>
        <div className="card-surface p-6 rounded-lg border border-outline-variant/60">
          <p className="text-body-lg text-on-surface-variant">
            You cannot edit or view slot group settings while the raffle is in progress. Please return to the dashboard until the live raffle is complete.
          </p>
        </div>
      </div>
    );
  }

  const [groups, { rows: departments }, totalParticipantsRow] = await Promise.all([
    listSlotGroups(event.id),
    query<{ id: string; department_name: string }>(
      `select id, department_name from departments where raffle_event_id = $1 order by department_name`,
      [event.id]
    ),
    queryOne<{ count: number }>(`select count(*)::int as count from participants where raffle_event_id = $1`, [event.id]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-headline-lg text-on-surface">Slot Groups</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Configure how many winners can be drawn from one or more departments.
        </p>
      </div>
      <SlotGroupsManager
        raffleEventId={event.id}
        groups={groups}
        allDepartments={departments}
        totalParticipants={totalParticipantsRow?.count ?? 0}
      />
    </div>
  );
}
