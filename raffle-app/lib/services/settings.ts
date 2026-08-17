// Re-exported for backwards compatibility with any client-side imports.
// All settings reads/writes go through the API route + settings.server.ts
// (Postgres access must stay server-side).
export type { RaffleSettingsRow } from "@/lib/services/settings.server";
