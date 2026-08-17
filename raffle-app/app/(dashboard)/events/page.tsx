import { getActiveEvent } from "@/lib/services/events";
import { getUserRole } from "@/lib/auth/session";
import { EventManager } from "@/components/features/settings/EventManager";
import { EventsList } from "@/components/features/settings/EventsList";

export default async function EventsPage() {
  const event = await getActiveEvent();
  const role = await getUserRole();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-headline-lg text-on-surface">Events Manager</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">Manage raffle events: archive, clear winners, or delete.</p>
        {role === "admin" && event && (
          <div className="mt-4">
            <EventManager raffleEventId={event.id} title={event.title} />
          </div>
        )}
        <EventsList isAdmin={role === "admin"} />
      </div>
    </div>
  );
}
