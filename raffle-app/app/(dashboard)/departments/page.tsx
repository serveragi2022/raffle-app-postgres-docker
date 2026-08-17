import { getActiveEvent } from "@/lib/services/events";
import { listDepartments } from "@/lib/services/departments";
import { DepartmentsManager } from "@/components/features/departments/DepartmentsManager";

export default async function DepartmentsPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Departments</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  const departments = await listDepartments(event.id);

  const rows = departments.map((d: any) => ({
    id: d.id,
    department_name: d.department_name,
    participant_count: d.participant_count ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-headline-lg text-on-surface">Departments</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Manage the departments participants are organized under.
        </p>
      </div>
      <DepartmentsManager raffleEventId={event.id} initialDepartments={rows} />
    </div>
  );
}
