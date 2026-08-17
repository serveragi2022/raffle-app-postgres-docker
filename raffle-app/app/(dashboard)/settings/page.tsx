import { getActiveEvent } from "@/lib/services/events";
import { getSettings } from "@/lib/services/settings.server";
import { SettingsForm } from "@/components/features/settings/SettingsForm";

export default async function SettingsPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Settings</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">No active raffle event found. Create or enable an event via the Events manager.</p>
        </div>
      </div>
    );
  }

  const settings = await getSettings(event.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-headline-lg text-on-surface">Settings</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Customize the raffle experience for this event.
        </p>
      </div>
      <SettingsForm
        raffleEventId={event.id}
        initial={{
          dark_mode: settings.dark_mode,
          animation_speed: settings.animation_speed,
          spin_duration_ms: settings.spin_duration_ms,
          sound_enabled: settings.sound_enabled,
          confetti_enabled: settings.confetti_enabled,
          company_logo_url: settings.company_logo_url,
        }}
      />
    </div>
  );
}
