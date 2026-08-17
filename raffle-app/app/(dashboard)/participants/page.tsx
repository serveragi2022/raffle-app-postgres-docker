import { getActiveEvent } from "@/lib/services/events";
import { listParticipants } from "@/lib/services/participants";
import { ImportPanel } from "@/components/features/participants/ImportPanel";
import { ClearParticipantsButton } from "@/components/features/participants/ClearParticipantsButton";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function ParticipantsPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Import Participants</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  const participants = await listParticipants(event.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg text-on-surface">Import Participants</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Upload your employee roster to populate the raffle database.
          </p>
        </div>
      </div>

      <ImportPanel />

      <Card>
        <CardHeader>
          <CardTitle>Current Roster</CardTitle>
          <div className="flex items-center gap-4">
            <span className="text-body-md text-on-surface-variant">{participants.length} participants</span>
            <ClearParticipantsButton />
          </div>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Employee Name</TH>
              <TH>Department</TH>
              <TH>Added</TH>
            </TR>
          </THead>
          <TBody>
            {participants.length === 0 && (
              <TR>
                <TD colSpan={3} className="text-center text-on-surface-variant py-8">
                  No participants imported yet.
                </TD>
              </TR>
            )}
            {participants.slice(0, 50).map((p: any) => (
              <TR key={p.id}>
                <TD className="font-medium">{p.employee_name}</TD>
                <TD>{p.departments?.department_name}</TD>
                <TD>{new Date(p.created_at).toLocaleDateString()}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {participants.length > 50 && (
          <p className="text-center text-body-md text-on-surface-variant py-3 border-t border-outline-variant/60">
            Showing 50 of {participants.length} participants
          </p>
        )}
      </Card>
    </div>
  );
}
