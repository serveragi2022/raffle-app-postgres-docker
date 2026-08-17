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

export function SettingsForm({ raffleEventId, initial }: { raffleEventId: string; initial: SettingsData }) {
  const router = useRouter();
  const supabase = null;
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

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
        description="Play a sound effect during the draw and reveal."
        checked={form.sound_enabled}
        onChange={(v) => setForm((f) => ({ ...f, sound_enabled: v }))}
      />
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
