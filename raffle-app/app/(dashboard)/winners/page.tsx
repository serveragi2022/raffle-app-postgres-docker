import { getActiveEvent } from "@/lib/services/events";
import { getUserRole } from "@/lib/auth/session";
import { listWinners } from "@/lib/services/winners";
import { WinnersTable } from "@/components/features/winners/WinnersTable";
import { ClearWinnersButton } from "@/components/features/winners/ClearWinnersButton";

export default async function WinnersPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Winners</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  const winners = await listWinners(event.id);
  const role = await getUserRole();
  const isViewer = role === "viewer";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-headline-lg text-on-surface">Winners</h1>
        <div className="flex items-center gap-4">
          <p className="text-body-lg text-on-surface-variant mt-1">
            {winners.length} winner{winners.length === 1 ? "" : "s"} drawn so far.
          </p>
          {!isViewer && <ClearWinnersButton />}
        </div>
      </div>
      <WinnersTable winners={winners} />
    </div>
  );
}
