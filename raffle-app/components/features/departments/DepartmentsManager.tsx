"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import {
  createDepartment,
  deleteDepartment,
  renameDepartment,
} from "@/lib/services/departments.client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";

export interface DepartmentRow {
  id: string;
  department_name: string;
  participant_count: number;
}

export function DepartmentsManager({
  raffleEventId,
  initialDepartments,
}: {
  raffleEventId: string;
  initialDepartments: DepartmentRow[];
}) {
  const router = useRouter();
  const supabase = null;
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createDepartment(supabase, raffleEventId, newName);
      setNewName("");
      setAddOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRename() {
    if (!editing || !editName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await renameDepartment(supabase, editing.id, editName);
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(dept: DepartmentRow) {
    if (dept.participant_count > 0) {
      if (!confirm(`${dept.department_name} has ${dept.participant_count} participant(s). Delete anyway?`)) return;
    }
    setBusy(true);
    try {
      await deleteDepartment(supabase, dept.id);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent title="Add Department">
            <div className="space-y-4">
              <div>
                <label className="label-uppercase block mb-1.5">Department Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Warehouse" />
              </div>
              {error && <p className="text-body-md text-error">{error}</p>}
              <Button className="w-full" onClick={handleAdd} loading={busy}>
                Create Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {initialDepartments.map((d) => (
          <Card key={d.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-primary-fixed text-primary flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div className="flex gap-1">
                <button
                  className="text-on-surface-variant hover:text-on-surface p-1.5 rounded hover:bg-surface-container-low"
                  onClick={() => {
                    setEditing(d);
                    setEditName(d.department_name);
                  }}
                  aria-label="Rename"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="text-on-surface-variant hover:text-error p-1.5 rounded hover:bg-error-container/30"
                  onClick={() => handleDelete(d)}
                  disabled={busy}
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="text-title-lg text-on-surface mb-1">{d.department_name}</h3>
            <p className="text-body-md text-on-surface-variant">{d.participant_count} participants</p>
          </Card>
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center py-10 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={24} className="mb-2" />
          <span className="font-semibold text-body-md">Add Department</span>
        </button>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Rename Department">
          <div className="space-y-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            {error && <p className="text-body-md text-error">{error}</p>}
            <Button className="w-full" onClick={handleRename} loading={busy}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
