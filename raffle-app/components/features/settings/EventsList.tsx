"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type EventRow = { id: string; title?: string | null; status?: string | null; created_at?: string | null };

export function EventsList({ isAdmin }: { isAdmin: boolean }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<"draft" | "in_progress" | "completed" | "archived">("draft");

  useEffect(() => {
    if (!isAdmin) return;
    fetchList();
  }, [isAdmin]);

  async function fetchList() {
    try {
      const res = await fetch("/api/events/list", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load events");
      setEvents(data ?? []);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? String(e));
    }
  }

  async function doAction(eventId: string, action: "archive" | "delete" | "reset") {
    if (!confirm(`Confirm ${action} for event ${eventId}?`)) return;
    setBusy(true);
    try {
        const res = await fetch("/api/events/delete", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed");
      await fetchList();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createEvent() {
    if (!newTitle.trim()) return alert("Enter a title");
    setBusy(true);
    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create event");
      setNewTitle("");
      await fetchList();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(eventId: string, status: "draft" | "in_progress" | "completed" | "archived") {
    setBusy(true);
    try {
      const res = await fetch("/api/events/update", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update status");
      await fetchList();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="mt-6">
      <h2 className="text-title-medium mb-2">Events</h2>
      <div className="mb-4 flex gap-2 items-center">
        <input className="border rounded px-2 py-1" placeholder="Event title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <select className="border rounded px-2 py-1" value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)}>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <Button size="sm" className="text-on-primary" onClick={createEvent} disabled={busy}>Create</Button>
      </div>
      <div className="overflow-auto border rounded">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Status</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.title ?? "(untitled)"}</td>
                <td className="p-2">{e.status}</td>
                <td className="p-2">{e.created_at ? new Date(e.created_at).toLocaleString() : "-"}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <select value={e.status ?? "draft"} onChange={(ev) => updateStatus(e.id, ev.target.value as any)} className="border rounded px-2 py-1">
                      <option value="draft">Draft</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <Button size="sm" variant="destructive" className="text-on-primary" onClick={() => doAction(e.id, "reset")} disabled={busy}>
                      Clear Winners
                    </Button>
                    <Button size="sm" variant="destructive" className="text-on-primary" onClick={() => doAction(e.id, "delete")} disabled={busy}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
