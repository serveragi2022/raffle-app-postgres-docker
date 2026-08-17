import { getActiveEvent } from "@/lib/services/events";
import { getSettings } from "@/lib/services/settings.server";
import { getUserRole } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db";
import { RaffleStage } from "@/components/features/raffle/RaffleStage";

export default async function RafflePage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Raffle</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  const settings = await getSettings(event.id);

  const [{ rows: groups }, role, { rows: winnerCounts }, currentPoolRow] = await Promise.all([
    query<{ id: string; group_name: string; is_all: boolean; slot_limit: number }>(
      `select id, group_name, is_all, slot_limit from slot_groups where raffle_event_id = $1 order by is_all asc, group_name`,
      [event.id]
    ),
    getUserRole(),
    query<{ slot_group_id: string }>(`select slot_group_id from winners where raffle_event_id = $1`, [event.id]),
    queryOne<{ count: number }>(`select count(*)::int as count from participants where raffle_event_id = $1`, [event.id]),
  ]);

  const isViewer = role === "viewer";

  const tally = new Map<string, number>();
  winnerCounts.forEach((w) => tally.set(w.slot_group_id, (tally.get(w.slot_group_id) ?? 0) + 1));

  const slotGroups = groups.map((g) => ({
    id: g.id,
    group_name: g.group_name,
    is_all: g.is_all,
    slot_limit: g.slot_limit,
    winners_drawn: tally.get(g.id) ?? 0,
  }));

  return (
    <RaffleStage
      slotGroups={slotGroups}
      eventTitle={event.title}
      currentPool={currentPoolRow?.count ?? 0}
      settings={settings}
      isViewer={isViewer}
    />
  );
}
