"use client";

import { useMemo, useState } from "react";
import { Search, Download, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { WinnerRow } from "@/lib/services/winners";

export function WinnersTable({ winners }: { winners: WinnerRow[] }) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const groupOptions = useMemo(
    () => Array.from(new Set(winners.map((w) => w.group_name))).sort(),
    [winners]
  );

  const filtered = winners.filter((w) => {
    const matchesSearch =
      !search ||
      w.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      w.department_name.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = groupFilter === "all" || w.group_name === groupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <Card>
      <div className="p-6 flex items-center justify-between flex-wrap gap-4 border-b border-outline-variant/60">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <Input
              className="pl-9 w-64"
              placeholder="Search name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/api/winners/export?format=csv">
            <Button variant="outline" size="sm">
              <Download size={14} /> CSV
            </Button>
          </a>
          <a href="/api/winners/export?format=xlsx">
            <Button variant="outline" size="sm">
              <FileSpreadsheet size={14} /> Excel
            </Button>
          </a>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Winner</TH>
            <TH>Department</TH>
            <TH>Date</TH>
            <TH>Time</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 && (
            <TR>
              <TD colSpan={5} className="text-center text-on-surface-variant py-8">
                No winners match your search.
              </TD>
            </TR>
          )}
          {filtered.map((w) => {
            const d = new Date(w.drawn_at);
            return (
              <TR key={w.id}>
                <TD className="font-semibold text-primary">{w.employee_name}</TD>
                <TD>{w.department_name}</TD>
                <TD>{d.toLocaleDateString()}</TD>
                <TD>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </Card>
  );
}
