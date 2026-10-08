import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  hasRaffleSound,
  isValidRaffleSoundEventId,
  isValidRaffleSoundType,
  readRaffleSound,
  removeRaffleSound,
  saveRaffleSound,
} from "@/lib/services/raffleSound.server";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
]);

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raffleEventId = new URL(req.url).searchParams.get("raffleEventId");
  const soundType = new URL(req.url).searchParams.get("type") ?? "draw";
  if (!raffleEventId || !isValidRaffleSoundEventId(raffleEventId)) {
    return NextResponse.json({ error: "Invalid raffleEventId." }, { status: 400 });
  }
  if (!isValidRaffleSoundType(soundType)) {
    return NextResponse.json({ error: "Invalid sound type." }, { status: 400 });
  }

  const sound = await readRaffleSound(raffleEventId, soundType);
  if (!sound) return NextResponse.json({ error: "No custom audio uploaded." }, { status: 404 });

  return new NextResponse(new Uint8Array(sound.audioData), {
    headers: {
      "Content-Type": sound.contentType,
      "Content-Length": String(sound.audioData.length),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const raffleEventId = formData.get("raffleEventId");
    const soundType = formData.get("type") ?? "draw";
    const file = formData.get("file");
    if (typeof raffleEventId !== "string" || !raffleEventId) {
      return NextResponse.json({ error: "Missing raffleEventId." }, { status: 400 });
    }
    if (!isValidRaffleSoundEventId(raffleEventId)) {
      return NextResponse.json({ error: "Invalid raffleEventId." }, { status: 400 });
    }
    if (!isValidRaffleSoundType(soundType)) {
      return NextResponse.json({ error: "Invalid sound type." }, { status: 400 });
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an audio file." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use an MP3, WAV, OGG, M4A, AAC, or WebM audio file." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Audio must be smaller than 8 MB." }, { status: 400 });
    }

    await saveRaffleSound(raffleEventId, file.type, Buffer.from(await file.arrayBuffer()), soundType);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload audio." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { raffleEventId, type = "draw" } = (await req.json()) as { raffleEventId?: string; type?: string };
    if (!raffleEventId || !isValidRaffleSoundEventId(raffleEventId)) {
      return NextResponse.json({ error: "Invalid raffleEventId." }, { status: 400 });
    }
    if (!isValidRaffleSoundType(type)) return NextResponse.json({ error: "Invalid sound type." }, { status: 400 });
    if (await hasRaffleSound(raffleEventId, type)) await removeRaffleSound(raffleEventId, type);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove audio." },
      { status: 500 }
    );
  }
}