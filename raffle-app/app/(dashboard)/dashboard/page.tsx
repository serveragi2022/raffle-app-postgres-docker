import Link from "next/link";
import { Users, Building2, Trophy, Ticket, Download, Play } from "lucide-react";
import { getActiveEvent } from "@/lib/services/events";
import { query, queryOne } from "@/lib/db";
import { StatCard } from "@/components/features/dashboard/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Dashboard</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  const [participantCountRow, departmentCountRow, slotGroupsRes, recentWinnersRes, winnersDrawnRow] = await Promise.all([
    queryOne<{ count: number }>(`select count(*)::int as count from participants where raffle_event_id = $1`, [event.id]),
    queryOne<{ count: number }>(`select count(*)::int as count from departments where raffle_event_id = $1`, [event.id]),
    query<{ id: string; slot_limit: number }>(`select id, slot_limit from slot_groups where raffle_event_id = $1`, [event.id]),
    query<any>(
      `select w.id, w.drawn_at, p.employee_name, d.department_name
       from winners w
       join participants p on p.id = w.participant_id
       join departments d on d.id = w.department_id
       where w.raffle_event_id = $1
       order by w.drawn_at desc
       limit 5`,
      [event.id]
    ),
    queryOne<{ count: number }>(`select count(*)::int as count from winners where raffle_event_id = $1`, [event.id]),
  ]);

  const participantCount = participantCountRow?.count ?? 0;
  const departmentCount = departmentCountRow?.count ?? 0;
  const slotGroups = slotGroupsRes.rows;
  const recentWinners = recentWinnersRes.rows;
  const winnersDrawn = winnersDrawnRow?.count ?? 0;

  const totalSlots = slotGroups.reduce((sum, g) => sum + g.slot_limit, 0);
  const remaining = Math.max(totalSlots - winnersDrawn, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">{event.title}</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">Raffle Management Dashboard</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download size={16} /> Download Report
          </Button>
          <Link href="/raffle">
            <Button variant="primary">
              <Play size={16} /> Start Raffle Session
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Participants" value={String(participantCount)} />
        <StatCard icon={Building2} label="Total Departments" value={String(departmentCount)} />
        <StatCard
          icon={Trophy}
          label="Winners Drawn"
          value={String(winnersDrawn)}
          progress={{ value: winnersDrawn, max: totalSlots || 1 }}
        />
        <StatCard icon={Ticket} label="Remaining Slots" value={String(remaining)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Winners</CardTitle>
          <Link href="/winners" className="text-body-md text-primary font-medium hover:underline">
            View all
          </Link>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Department</TH>
              <TH>Time Drawn</TH>
            </TR>
          </THead>
          <TBody>
            {recentWinners.length === 0 && (
              <TR>
                <TD colSpan={4} className="text-center text-on-surface-variant py-8">
                  No winners drawn yet.
                </TD>
              </TR>
            )}
            {recentWinners.map((w: any) => (
              <TR key={w.id}>
                <TD className="font-semibold text-primary">{w.employee_name}</TD>
                <TD>{w.department_name}</TD>
                <TD>{new Date(w.drawn_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
