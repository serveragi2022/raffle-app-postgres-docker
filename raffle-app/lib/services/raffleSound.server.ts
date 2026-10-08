import { access, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOUND_DIRECTORY = process.env.RAFFLE_UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export type RaffleSoundType = "draw" | "winner";

export function isValidRaffleSoundEventId(eventId: string): boolean {
  return EVENT_ID_PATTERN.test(eventId);
}

export function isValidRaffleSoundType(soundType: unknown): soundType is RaffleSoundType {
  return soundType === "draw" || soundType === "winner";
}

function getSoundPath(eventId: string, soundType: RaffleSoundType = "draw"): string {
  if (!isValidRaffleSoundEventId(eventId)) throw new Error("Invalid raffleEventId.");
  return path.join(/*turbopackIgnore: true*/ SOUND_DIRECTORY, soundType === "draw" ? `${eventId}.sound` : `${eventId}.winner.sound`);
}

export async function hasRaffleSound(eventId: string, soundType: RaffleSoundType = "draw"): Promise<boolean> {
  try {
    await access(getSoundPath(eventId, soundType));
    return true;
  } catch {
    return false;
  }
}

export async function readRaffleSound(
  eventId: string,
  soundType: RaffleSoundType = "draw"
): Promise<{ contentType: string; audioData: Buffer } | null> {
  try {
    const fileData = await readFile(/*turbopackIgnore: true*/ getSoundPath(eventId, soundType));
    if (fileData.length < 5) return null;
    const contentTypeLength = fileData.readUInt32BE(0);
    if (contentTypeLength === 0 || contentTypeLength > 128 || fileData.length <= 4 + contentTypeLength) return null;
    const contentType = fileData.toString("utf8", 4, 4 + contentTypeLength);
    return { contentType, audioData: fileData.subarray(4 + contentTypeLength) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function saveRaffleSound(
  eventId: string,
  contentType: string,
  audioData: Buffer,
  soundType: RaffleSoundType = "draw"
): Promise<void> {
  const soundPath = getSoundPath(eventId, soundType);
  await mkdir(SOUND_DIRECTORY, { recursive: true });
  const typeData = Buffer.from(contentType, "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(typeData.length);
  const fileData = Buffer.concat([header, typeData, audioData]);
  const temporaryPath = `${soundPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, fileData);
  await rename(temporaryPath, soundPath);
}

export async function removeRaffleSound(eventId: string, soundType: RaffleSoundType = "draw"): Promise<void> {
  try {
    await unlink(getSoundPath(eventId, soundType));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}