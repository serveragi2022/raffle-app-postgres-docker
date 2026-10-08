"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/lib/services/settings.client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnimationSpeed } from "@/lib/types/database.types";

interface SettingsData {
  dark_mode: boolean;
  animation_speed: AnimationSpeed;
  spin_duration_ms: number;
  sound_enabled: boolean;
  confetti_enabled: boolean;
  company_logo_url: string | null;
}

type SoundType = "draw" | "winner";

export function SettingsForm({ raffleEventId, initial, hasUploadedSound, hasUploadedWinnerSound }: {
  raffleEventId: string;
  initial: SettingsData;
  hasUploadedSound: boolean;
  hasUploadedWinnerSound: boolean;
}) {
  const router = useRouter();
  const supabase = null;
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [soundFiles, setSoundFiles] = useState<Record<SoundType, File | null>>({ draw: null, winner: null });
  const [soundBusy, setSoundBusy] = useState<SoundType | null>(null);
  const [uploadedSounds, setUploadedSounds] = useState<Record<SoundType, boolean>>({
    draw: hasUploadedSound,
    winner: hasUploadedWinnerSound,
  });
  const [soundStatuses, setSoundStatuses] = useState<Record<SoundType, { text: string; error: boolean }>>({
    draw: { text: "", error: false },
    winner: { text: "", error: false },
  });

  async function handleSave() {
    setBusy(true);
    setSaved(false);
    try {
      await updateSettings(supabase, raffleEventId, form);
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSoundUpload(type: SoundType) {
    const soundFile = soundFiles[type];
    if (!soundFile) return;
    setSoundBusy(type);
    setSoundStatuses((statuses) => ({ ...statuses, [type]: { text: "", error: false } }));
    const data = new FormData();
    data.set("raffleEventId", raffleEventId);
    data.set("type", type);
    data.set("file", soundFile);
    try {
      const res = await fetch("/api/settings/sound", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to upload audio.");
      setUploadedSounds((sounds) => ({ ...sounds, [type]: true }));
      setSoundFiles((files) => ({ ...files, [type]: null }));
      setSoundStatuses((statuses) => ({ ...statuses, [type]: { text: "Audio uploaded.", error: false } }));
      router.refresh();
    } catch (error) {
      setSoundStatuses((statuses) => ({
        ...statuses,
        [type]: { text: error instanceof Error ? error.message : "Failed to upload audio.", error: true },
      }));
    } finally {
      setSoundBusy(null);
    }
  }

  async function handleSoundDelete(type: SoundType) {
    setSoundBusy(type);
    setSoundStatuses((statuses) => ({ ...statuses, [type]: { text: "", error: false } }));
    try {
      const res = await fetch("/api/settings/sound", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raffleEventId, type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove audio.");
      setUploadedSounds((sounds) => ({ ...sounds, [type]: false }));
      setSoundStatuses((statuses) => ({
        ...statuses,
        [type]: {
          text: type === "draw" ? "Custom audio removed. The built-in drum roll will play instead." : "Custom winner sound removed. The default chime will play instead.",
          error: false,
        },
      }));
      router.refresh();
    } catch (error) {
      setSoundStatuses((statuses) => ({
        ...statuses,
        [type]: { text: error instanceof Error ? error.message : "Failed to remove audio.", error: true },
      }));
    } finally {
      setSoundBusy(null);
    }
  }

  return (
    <Card className="p-6 max-w-2xl space-y-6">
      <ToggleRow
        label="Dark Mode"
        description="Switch the interface to a dark color scheme."
        checked={form.dark_mode}
        onChange={(v) => setForm((f) => ({ ...f, dark_mode: v }))}
      />
      <ToggleRow
        label="Sound"
        description="Play sounds during the draw and when a winner is revealed."
        checked={form.sound_enabled}
        onChange={(v) => setForm((f) => ({ ...f, sound_enabled: v }))}
      />

      {(["draw", "winner"] as const).map((type) => (
        <div className="space-y-2" key={type}>
          <label className="label-uppercase block">
            {type === "draw" ? "Custom Drum Roll Audio" : "Custom Winner Sound"}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac,audio/webm"
              className="max-w-md"
              onChange={(e) => setSoundFiles((files) => ({ ...files, [type]: e.target.files?.[0] ?? null }))}
            />
            <Button
              onClick={() => handleSoundUpload(type)}
              disabled={!soundFiles[type] || soundBusy !== null}
              loading={soundBusy === type}
            >
              Upload Audio
            </Button>
            {uploadedSounds[type] && (
              <Button variant="outline" onClick={() => handleSoundDelete(type)} disabled={soundBusy !== null}>
                Remove Audio
              </Button>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant">MP3, WAV, OGG, M4A, AAC, or WebM; maximum 8 MB.</p>
          {soundStatuses[type].text && (
            <p className={`text-body-sm ${soundStatuses[type].error ? "text-error" : "text-secondary"}`} role="status">
              {soundStatuses[type].text}
            </p>
          )}
        </div>
      ))}
      <ToggleRow
        label="Confetti"
        description="Show a confetti burst when a winner is revealed."
        checked={form.confetti_enabled}
        onChange={(v) => setForm((f) => ({ ...f, confetti_enabled: v }))}
      />

      <div>
        <label className="label-uppercase block mb-1.5">Animation Speed</label>
        <select
          className="input-field max-w-xs"
          value={form.animation_speed}
          onChange={(e) => setForm((f) => ({ ...f, animation_speed: e.target.value as AnimationSpeed }))}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>

      <div>
        <label className="label-uppercase block mb-1.5">Spin Duration (ms)</label>
        <Input
          type="number"
          min={1000}
          max={10000}
          step={100}
          className="max-w-xs"
          value={form.spin_duration_ms}
          onChange={(e) => setForm((f) => ({ ...f, spin_duration_ms: Number(e.target.value) }))}
        />
      </div>

      <div>
        <label className="label-uppercase block mb-1.5">Company Logo URL</label>
        <Input
          className="max-w-md"
          placeholder="https://your-cdn.com/logo.png"
          value={form.company_logo_url ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, company_logo_url: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} loading={busy}>
          Save Settings
        </Button>
        {saved && <span className="text-body-md text-secondary">Saved.</span>}
      </div>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-body-lg text-on-surface font-medium">{label}</p>
        <p className="text-body-md text-on-surface-variant">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
          checked ? "bg-primary" : "bg-outline-variant"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
