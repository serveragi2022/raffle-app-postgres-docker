import { query, withTransaction } from "@/lib/db";

/**
 * Permanently deletes an event and all related data.
 */
export async function deleteEventAndData(raffleEventId: string) {
  await withTransaction(async (client) => {
    await client.query(`delete from raffle_actions where raffle_event_id = $1`, [raffleEventId]);
    await client.query(`delete from winners where raffle_event_id = $1`, [raffleEventId]);
    await client.query(`delete from participants where raffle_event_id = $1`, [raffleEventId]);
    await client.query(`delete from slot_group_departments where slot_group_id in (select id from slot_groups where raffle_event_id = $1)`, [raffleEventId]);
    await client.query(`delete from slot_groups where raffle_event_id = $1`, [raffleEventId]);
    await client.query(`delete from raffle_settings where raffle_event_id = $1`, [raffleEventId]);
    await client.query(`delete from departments where raffle_event_id = $1`, [raffleEventId]);
    await client.query(`delete from raffle_events where id = $1`, [raffleEventId]);
  });
}

export async function archiveEvent(raffleEventId: string) {
  await query(`update raffle_events set status = 'archived' where id = $1`, [raffleEventId]);
}

/** Wipes every domain table. Used by the "delete all data" admin action. */
export async function deleteAllData() {
  await withTransaction(async (client) => {
    await client.query(`delete from raffle_actions`);
    await client.query(`delete from winners`);
    await client.query(`delete from participants`);
    await client.query(`delete from slot_group_departments`);
    await client.query(`delete from slot_groups`);
    await client.query(`delete from raffle_settings`);
    await client.query(`delete from departments`);
    await client.query(`delete from raffle_events`);
  });
}
