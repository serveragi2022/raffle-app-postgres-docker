import { queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

export type AppUserRole = "admin" | "viewer";

export interface AppUserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: AppUserRole;
}

export async function findUserByEmail(email: string): Promise<AppUserRow | null> {
  return queryOne<AppUserRow>(`select * from app_users where email = $1`, [email.toLowerCase().trim()]);
}

/** Verifies email + password. Returns the user row on success, null on failure. */
export async function authenticate(email: string, password: string): Promise<AppUserRow | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  return user;
}

export async function getUserRoleById(userId: string): Promise<AppUserRole | null> {
  const user = await queryOne<{ role: AppUserRole }>(`select role from app_users where id = $1`, [userId]);
  return user?.role ?? null;
}
