"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Layers, CheckCircle2, Globe2 } from "lucide-react";
import { createSlotGroup, updateSlotGroup, deleteSlotGroup } from "@/lib/services/slotGroups.client";
import type { SlotGroupWithDetails } from "@/lib/services/slotGroups.client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";

interface DeptOption {
  id: string;
  department_name: string;
}

export function SlotGroupsManager({
  raffleEventId,
  groups,
  allDepartments,
  totalParticipants,
}: {
  raffleEventId: string;
  groups: SlotGroupWithDetails[];
  allDepartments: DeptOption[];
  totalParticipants: number;
}) {
  const router = useRouter();
  const supabase = null;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [limit, setLimit] = useState<number>(1);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [applyAllDepts, setApplyAllDepts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Builds a readable default name like "ADM_EEG" or "ADM_EEG_HRD_+2" from the
  // currently selected departments. Only used while the user hasn't typed
  // their own name.
  const MAX_NAME_DEPTS = 4;
  function generateGroupName(deptIds: string[], applyAll: boolean) {
    if (applyAll) return "ALL";
    const names = allDepartments
      .filter((d) => deptIds.includes(d.id))
      .map((d) => d.department_name);
    if (names.length === 0) return "";
    const shown = names.slice(0, MAX_NAME_DEPTS).join("_");
    return names.length > MAX_NAME_DEPTS
      ? `${shown}_+${names.length - MAX_NAME_DEPTS}`
      : shown;
  }

  const customGroups = groups.filter((g) => !g.is_all);
  const allGroup = groups.find((g) => g.is_all);

  // A group that spans every department is intentionally overlapping (like the
  // built-in ALL group) — it should NOT lock departments out of other groups.
  // This is driven by the real applies_to_all/is_all columns, not inferred
  // from comparing department_ids against the current department list.
  function spansAllDepartments(g: SlotGroupWithDetails) {
    return g.applies_to_all || g.is_all;
  }

  // Only groups with a MANUALLY picked, non-all-departments scope create exclusivity.
  // "Apply to ALL" groups are excluded here so they don't block other groups from
  // being created/edited.
  const claimedDeptIds = new Set(
    customGroups
      .filter((g) => g.id !== editingId)
      .filter((g) => !spansAllDepartments(g))
      .flatMap((g) => g.department_ids)
  );
  const availableDepartments = allDepartments.filter((d) => !claimedDeptIds.has(d.id));

  function openCreate() {
    setEditingId(null);
    setName("");
    setNameManuallyEdited(false);
    setLimit(1);
    setSelectedDepts([]);
    setApplyAllDepts(false);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(g: SlotGroupWithDetails) {
    setEditingId(g.id);
    setName(g.group_name);
    // An existing group already has a name someone chose (or that was
    // auto-generated at creation time) — treat it as manual so tweaking
    // departments during an edit doesn't silently rename the group.
    setNameManuallyEdited(true);
    setLimit(g.slot_limit);
    setSelectedDepts(g.department_ids);
    setApplyAllDepts(spansAllDepartments(g));
    setError(null);
    setFormOpen(true);
  }

  function toggleDept(id: string) {
    setSelectedDepts((prev) => {
      const next = prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id];
      if (!nameManuallyEdited) {
        setName(generateGroupName(next, applyAllDepts));
      }
      return next;
    });
  }

  function handleToggleApplyAll(checked: boolean) {
    setApplyAllDepts(checked);
    const next = checked ? allDepartments.map((d) => d.id) : [];
    setSelectedDepts(next);
    if (!nameManuallyEdited) {
      setName(generateGroupName(next, checked));
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    // If they clear the field entirely, fall back into auto-generate mode
    // rather than leaving them stuck with a blank name.
    setNameManuallyEdited(value.trim().length > 0);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    const departmentIds = applyAllDepts ? allDepartments.map((d) => d.id) : selectedDepts;
    if (departmentIds.length === 0) {
      setError(applyAllDepts ? "No departments exist yet." : "Select at least one department.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateSlotGroup(supabase, editingId, {
          groupName: name,
          slotLimit: limit,
          departmentIds,
          appliesToAll: applyAllDepts,
        });
      } else {
        await createSlotGroup(supabase, {
          raffleEventId,
          groupName: name,
          slotLimit: limit,
          departmentIds,
          appliesToAll: applyAllDepts,
        });
      }
      setFormOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(g: SlotGroupWithDetails) {
    if (g.winners_drawn > 0) {
      if (!confirm(`${g.group_name} already has ${g.winners_drawn} winner(s) drawn. Delete anyway?`)) return;
    } else if (!confirm(`Delete group "${g.group_name}"?`)) return;
    setBusy(true);
    try {
      await deleteSlotGroup(supabase, g.id);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateAllLimit(newLimit: number) {
    if (!allGroup) return;
    await updateSlotGroup(supabase, allGroup.id, { slotLimit: newLimit });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-6">
          <Stat label="Total Slots Assigned" value={groups.reduce((s, g) => s + g.slot_limit, 0)} />
          <Stat label="Total Participants" value={totalParticipants} />
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} /> Create Slot Group
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Edit Slot Group" : "Create Slot Group"}>
            <div className="space-y-4">
              <div>
                <label className="label-uppercase block mb-1.5">Group Name</label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. ADM_EEG" />
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {nameManuallyEdited
                    ? "Custom name — clear the field to auto-generate again."
                    : "Auto-generated from selected departments."}
                </p>
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Slot Limit</label>
                <Input
                  type="number"
                  min={1}
                  max={totalParticipants}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
                <p className="text-body-sm text-on-surface-variant mt-1">
                  This limit applies to this group regardless of department scope.
                </p>
              </div>

              <label className="flex items-center gap-3 px-3 py-2.5 rounded border border-outline-variant bg-surface-container-low/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyAllDepts}
                  onChange={(e) => handleToggleApplyAll(e.target.checked)}
                />
                <Globe2 size={16} className="text-primary" />
                <div>
                  <p className="text-body-md font-medium text-on-surface">Apply to ALL departments</p>
                  <p className="text-body-sm text-on-surface-variant">
                    Draws from every department, even ones already assigned elsewhere — still limited to {limit || 0} slot{limit === 1 ? "" : "s"}. Won&apos;t block other groups from being created.
                  </p>
                </div>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label-uppercase">Departments</label>
                  {!applyAllDepts && (
                    <button
                      type="button"
                      className="text-body-sm text-primary hover:underline"
                      onClick={() => {
                        const next =
                          selectedDepts.length === availableDepartments.length
                            ? []
                            : availableDepartments.map((d) => d.id);
                        setSelectedDepts(next);
                        if (!nameManuallyEdited) {
                          setName(generateGroupName(next, applyAllDepts));
                        }
                      }}
                    >
                      {selectedDepts.length === availableDepartments.length ? "Clear all" : "Select all available"}
                    </button>
                  )}
                </div>
                <div
                  className={`max-h-48 overflow-y-auto border border-outline-variant rounded divide-y divide-outline-variant/60 ${
                    applyAllDepts ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {allDepartments.map((d) => {
                    const disabled = applyAllDepts || claimedDeptIds.has(d.id);
                    const checked = applyAllDepts ? true : selectedDepts.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-3 px-3 py-2.5 text-body-md ${
                          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-surface-container-low"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleDept(d.id)}
                        />
                        {d.department_name}
                        {!applyAllDepts && claimedDeptIds.has(d.id) && (
                          <span className="ml-auto text-label-md text-on-surface-variant">Already assigned</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              {error && <p className="text-body-md text-error">{error}</p>}
              <Button className="w-full" onClick={handleSave} loading={busy}>
                {editingId ? "Save Changes" : "Create Slot Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {allGroup && (
          <Card className="p-6 border-tertiary-container/40 bg-gradient-to-br from-tertiary-container/5 to-transparent">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-gold/15 text-tertiary-container flex items-center justify-center">
                <Layers size={18} />
              </div>
              <Badge variant="gold">ALL</Badge>
            </div>
            <h3 className="text-title-lg text-on-surface mb-1">ALL Departments</h3>
            <p className="text-body-md text-on-surface-variant mb-4">
              Automatically includes every department. Respects each group&apos;s own limit.
            </p>
            <div className="flex items-center justify-between text-body-md mb-1.5">
              <span className="text-on-surface-variant">Slot Limit</span>
              <input
                type="number"
                min={0}
                defaultValue={allGroup.slot_limit}
                className="w-20 text-right input-field py-1"
                onBlur={(e) => updateAllLimit(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between text-body-md mb-2">
              <span className="text-on-surface-variant">Winners Selected</span>
              <span className="font-semibold text-on-surface">
                {allGroup.winners_drawn} / {allGroup.slot_limit}
              </span>
            </div>
            <Progress value={allGroup.winners_drawn} max={allGroup.slot_limit || 1} />
          </Card>
        )}

        {customGroups.map((g) => {
          const full = g.winners_drawn >= g.slot_limit;
          const spansAll = spansAllDepartments(g);
          return (
            <Card key={g.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-md bg-primary-fixed text-primary flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <div className="flex items-center gap-1">
                  {spansAll && <Badge variant="gold">ALL DEPTS</Badge>}
                  <button
                    className="text-on-surface-variant hover:text-on-surface p-1.5 rounded hover:bg-surface-container-low"
                    onClick={() => openEdit(g)}
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="text-on-surface-variant hover:text-error p-1.5 rounded hover:bg-error-container/30"
                    onClick={() => handleDelete(g)}
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="text-title-lg text-on-surface mb-1">{g.group_name}</h3>
              <p className="text-body-md text-on-surface-variant mb-4">
                {spansAll ? "All departments" : g.department_names.join(", ") || "No departments"}
              </p>
              <div className="flex items-center justify-between text-body-md mb-2">
                <span className="text-on-surface-variant">
                  Participants <span className="font-semibold text-on-surface">{g.participant_count}</span>
                </span>
                <span className="text-on-surface-variant">
                  Winners <span className="font-semibold text-on-surface">{g.winners_drawn} / {g.slot_limit}</span>
                </span>
              </div>
              <Progress value={g.winners_drawn} max={g.slot_limit || 1} barClassName={full ? "from-secondary to-secondary" : undefined} />
              {full ? (
                <p className="flex items-center gap-1.5 text-body-md text-secondary mt-2 font-medium">
                  <CheckCircle2 size={14} /> Allocation Complete
                </p>
              ) : (
                <p className="text-body-md text-on-surface-variant mt-2">
                  {g.slot_limit - g.winners_drawn} slots remaining
                </p>
              )}
            </Card>
          );
        })}

        <button
          onClick={openCreate}
          className="border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center py-10 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={24} className="mb-2" />
          <span className="font-semibold text-body-md">Create Slot Group</span>
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="label-uppercase mb-1">{label}</p>
      <p className="text-headline-md text-on-surface">{value}</p>
    </div>
  );
}