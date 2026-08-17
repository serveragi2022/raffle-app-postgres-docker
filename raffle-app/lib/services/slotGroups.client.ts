import type { SlotGroupWithDetails } from "@/lib/services/slotGroups";
export type { SlotGroupWithDetails } from "@/lib/services/slotGroups";

export async function createSlotGroup(
  _unused: unknown,
  params: {
    raffleEventId: string;
    groupName: string;
    slotLimit: number;
    departmentIds: string[];
    appliesToAll?: boolean;
  }
) {
  const res = await fetch("/api/slot-groups/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create slot group.");
  return json;
}

export async function updateSlotGroup(
  _unused: unknown,
  slotGroupId: string,
  params: {
    groupName?: string;
    slotLimit?: number;
    departmentIds?: string[];
    appliesToAll?: boolean;
  }
) {
  const res = await fetch("/api/slot-groups/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotGroupId, ...params }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update slot group.");
  return json;
}

export async function deleteSlotGroup(_unused: unknown, slotGroupId: string) {
  const res = await fetch("/api/slot-groups/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotGroupId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete slot group.");
  return json;
}
