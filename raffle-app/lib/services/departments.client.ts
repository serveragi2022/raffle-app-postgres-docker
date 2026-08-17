// Browser-safe wrappers matching the original service function names/shapes,
// but calling the server API routes instead of talking to Postgres directly
// (a browser can never hold a `pg` connection). The unused first parameter
// is kept so call sites that still pass a (now-defunct) client reference
// don't need to be rewritten.
export async function createDepartment(_unused: unknown, raffleEventId: string, name: string) {
  const res = await fetch("/api/departments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raffleEventId, name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create department.");
  return json;
}

export async function renameDepartment(_unused: unknown, departmentId: string, name: string) {
  const res = await fetch("/api/departments/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ departmentId, name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to rename department.");
  return json;
}

export async function deleteDepartment(_unused: unknown, departmentId: string) {
  const res = await fetch("/api/departments/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ departmentId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete department.");
  return json;
}
