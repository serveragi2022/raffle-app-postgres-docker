"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Ticket, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRaffleStore } from "@/store/raffleStore";
import { Button } from "@/components/ui/button";
import type { DrawResult } from "@/lib/services/raffle";
import type { AnimationSpeed } from "@/lib/types/database.types";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

export interface RaffleSlotGroupOption {
  id: string;
  group_name: string;
  is_all: boolean;
  slot_limit: number;
  winners_drawn: number;
}

const DEFAULT_SPIN_MS = 10000;

export interface RaffleStageSettings {
  dark_mode?: boolean;
  animation_speed?: AnimationSpeed;
  spin_duration_ms: number;
  confetti_enabled: boolean;
  sound_enabled: boolean;
  company_logo_url: string | null;
}

function nameFontSize(name: string): string {
  const len = name.length;
  if (len > 22) return "clamp(1.5rem, 6.5cqw, 3.75rem)";
  if (len > 16) return "clamp(2rem, 8cqw, 5.5rem)";
  if (len > 11) return "clamp(2.5rem, 9.5cqw, 6.5rem)";
  return "clamp(3rem, 11.5cqw, 7.5rem)";
}
// Marquee names now use the SAME size scale as the winner reveal — sized to the
// longest name in the pool, so it looks as big/consistent as the "revealed" screenshot.
function uniformMarqueeFontSize(names: string[]): string {
  if (names.length === 0) return nameFontSize("");
  const longest = names.reduce((a, b) => (b.length > a.length ? b : a), names[0]);
  return nameFontSize(longest);
}

export function RaffleStage({
  slotGroups,
  eventTitle,
  currentPool,
  settings,
  isViewer,
}: {
  slotGroups: RaffleSlotGroupOption[];
  eventTitle: string;
  currentPool: number;
  settings?: RaffleStageSettings;
  isViewer?: boolean;
}) {
  const baseSpinMs = settings?.spin_duration_ms ?? DEFAULT_SPIN_MS;
  const animationSpeed = settings?.animation_speed ?? "normal";
  const animationFactor = animationSpeed === "fast" ? 0.7 : animationSpeed === "slow" ? 1.3 : 1;
  const spinMs = Math.max(2000, Math.round(baseSpinMs * animationFactor));
  const marqueeIntervalMs = animationSpeed === "fast" ? 450 : animationSpeed === "slow" ? 1050 : 700;
  const revealTransitionDuration = animationSpeed === "fast" ? 0.25 : animationSpeed === "slow" ? 0.8 : 0.45;
  const confettiEnabled = settings?.confetti_enabled ?? true;
  const soundEnabled = settings?.sound_enabled ?? false;
  const logoUrl = settings?.company_logo_url ?? null;
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { phase, currentWinner, startSpin, reveal, reset, error, setError } = useRaffleStore();
  const router = useRouter();
  const [recentWinners, setRecentWinners] = useState<{
    id: string;
    employee_name: string;
    department_name: string;
    drawn_at: string;
  }[]>([]);
  const [remainingSlots, setRemainingSlots] = useState<number>(
    slotGroups.reduce((s, g) => s + Math.max(0, g.slot_limit - g.winners_drawn), 0)
  );
  const [localGroups, setLocalGroups] = useState<RaffleSlotGroupOption[]>(() => slotGroups);

  const [scrollNames, setScrollNames] = useState<string[]>([]);
  const displayPoolRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [marqueeFontSize, setMarqueeFontSize] = useState<string>(nameFontSize(""));

  const recentReqIdRef = useRef(0);
  async function loadRecentWinners() {
    const reqId = ++recentReqIdRef.current;
    try {
      const res = await fetch('/api/winners/recent');
      const data = await res.json();
      if (reqId !== recentReqIdRef.current) return;
      if (res.ok && Array.isArray(data)) setRecentWinners(data);
    } catch (e) {
      // ignore errors silently
    }
  }

  // Load recent winners once on mount. Any update after a draw is handled
  // exclusively by the reveal-triggered effect below, so the list never
  // jumps ahead of the animation.
  useEffect(() => {
    loadRecentWinners();
  }, []);

  useEffect(() => {
    if (phase !== 'revealed') return;
    // Delay updating the recent winners list until the reveal animation
    // has actually finished playing, so the name never appears in this
    // list before it appears on stage.
    const delayMs = Math.max(300, Math.round(revealTransitionDuration * 1000) + 200);
    const revealTimeout = setTimeout(() => {
      if (currentWinner) {
        setRecentWinners((prev) => [
          {
            id: currentWinner.winner_id ?? currentWinner.participant_id,
            employee_name: currentWinner.employee_name,
            department_name: currentWinner.department_name,
            drawn_at: currentWinner.drawn_at,
          },
          ...prev.filter((r) => (r.id !== (currentWinner.winner_id ?? currentWinner.participant_id))),
        ]);
      }
      loadRecentWinners();
    }, delayMs);
    return () => clearTimeout(revealTimeout);
  }, [phase, currentWinner, revealTransitionDuration]);

  const remainingReqIdRef = useRef(0);
  async function loadRemainingSlots() {
    const reqId = ++remainingReqIdRef.current;
    try {
      const res = await fetch('/api/slot-groups/remaining');
      const data = await res.json();
      // Ignore this response if a newer request has been issued since —
      // fetch responses can resolve out of order (the 3s poll and the
      // reveal-triggered refresh race each other), so without this guard a
      // stale response can overwrite a fresher one and the number visibly
      // "reverts" before snapping to the correct value again.
      if (reqId !== remainingReqIdRef.current) return;
      if (res.ok && typeof data.remaining === 'number') setRemainingSlots(data.remaining);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    loadRemainingSlots();
  }, []);

  // Poll every 3 seconds for near-real-time updates, but skip ticks while
  // spinning — the draw already committed to the DB the moment the spin
  // started, so polling during the spin would drop the visible count
  // before the winner is even revealed. loadRemainingSlots() is called
  // explicitly at reveal time instead, keeping the number's change in
  // sync with what the user sees on stage.
/*   useEffect(() => {
    const id = setInterval(() => {
      if (phase === 'spinning') return;
      loadRemainingSlots();
    }, 3000);
    return () => clearInterval(id);
  }, [phase]); */

  // Keep localGroups in sync whenever the server-rendered slotGroups prop
  // changes (e.g. after router.refresh()), instead of only capturing it once
  // at mount. Without this, availableGroups/selectedGroup can drift from the
  // real slot-group counts after the first draw.
  useEffect(() => {
    setLocalGroups(slotGroups);
  }, [slotGroups]);

  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "idle") {
      displayPoolRef.current = [];
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [phase]);

  const availableGroups = localGroups.filter((g) => g.winners_drawn < g.slot_limit);
  const selectedGroup = availableGroups.length > 0
    ? availableGroups[Math.floor(Math.random() * availableGroups.length)]
    : localGroups[0] ?? {
        id: "",
        group_name: "ALL",
        is_all: true,
        slot_limit: 0,
        winners_drawn: 0,
      };
  const noAvailableGroup = availableGroups.length === 0;
  const groupFull = noAvailableGroup;

  const isDrawingRef = useRef(false);

  async function handleStartDraw() {
    // Guard against double-draws from a rapid double-click/double-tap.
    // `phase` only flips to "spinning" (which disables the button) after
    // the eligibility check and participants fetch below finish awaiting —
    // during that window `phase` is still "idle", so the button-disabled
    // check alone doesn't stop a second click from starting a second real
    // draw on the server. This ref closes that gap synchronously.
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;

    if (!selectedGroup?.id || groupFull) {
      setError("No available slot remain with open draws.");
      isDrawingRef.current = false;
      return;
    }
    // Try the selected group first, then fall back to any other available group
    let finalGroup = selectedGroup;
    try {
      const candidates = [selectedGroup, ...availableGroups.filter((g) => g.id !== selectedGroup.id)];
      let found = false;
      for (const g of candidates) {
        try {
          const eligRes = await fetch("/api/raffle/eligible", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slotGroupId: g.id }),
            credentials: "same-origin",
          });
          const eligData = await eligRes.json();
          if (eligRes.ok && Array.isArray(eligData) && eligData.length > 0) {
            finalGroup = g;
            found = true;
            break;
          }
        } catch (innerErr) {
          // ignore and try next group
        }
      }
      if (!found) {
        setError("No eligible participants remain.");
        isDrawingRef.current = false;
        return;
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
      isDrawingRef.current = false;
      return;
    }

    try {
      // Fetch all participants for display (marquee should not be limited by slot group)
      const displayRes = await fetch("/api/participants/list");
      const displayData = await displayRes.json();
      const displayNames: string[] = Array.isArray(displayData) ? displayData.map((p: any) => p.employee_name) : [];
      if (displayNames.length === 0) {
        throw new Error("No participants available to display.");
      }

      // store pool for periodic reshuffles during the spin
      displayPoolRef.current = displayNames;
      setScrollNames(generateShuffleNames(displayNames));
      // Lock in one consistent font size for the whole spin, based on the longest name in the pool
      setMarqueeFontSize(uniformMarqueeFontSize(displayNames));
      startSpin();
      // From here on, phase === "spinning" disables the button, so the ref
      // guard has done its job for this click; release it.
      isDrawingRef.current = false;

      // Perform the actual draw (server enforces slot-group eligibility)
      const res = await fetch("/api/raffle/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotGroupId: finalGroup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draw failed");

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        reveal(data as DrawResult);

        // Re-sync counts from the server instead of guessing with local
        // arithmetic. The draw already committed to the DB well before this
        // point (it happened right when the spin started, not at reveal),
        // and the 3s poll may have already synced remainingSlots down in the
        // meantime — so a blind "-1" here could double-decrement. Fetching
        // the real values keeps this always correct regardless of timing.
        const groupId = (data as DrawResult).slot_group_id;
        setLocalGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, winners_drawn: (g.winners_drawn ?? 0) + 1 } : g)));
        loadRemainingSlots();

        // Refresh server-rendered data (slot groups, counts) so parent server components update
        try {
          router.refresh();
        } catch (_) {
          // ignore
        }
      }, spinMs);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // While spinning, periodically reshuffle names so the sequence appears random.
  useEffect(() => {
    if (phase !== "spinning") return;
    const id = setInterval(() => {
      if (displayPoolRef.current.length > 0) setScrollNames(generateShuffleNames(displayPoolRef.current));
    }, marqueeIntervalMs);
    return () => clearInterval(id);
  }, [phase, marqueeIntervalMs]);

  // Plays a short two-note chime on reveal. Uses the Web Audio API directly
  // rather than an <audio> element so no sound asset file is required.
  useEffect(() => {
    if (phase !== "revealed" || !soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      const notes = [880, 1318.51]; // A5 then E6 — a bright little "ta-da"
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch (soundErr) {
      console.warn("Reveal sound unavailable:", soundErr);
    }
  }, [phase, soundEnabled]);

  return (
    <div className="relative rounded-lg bg-gradient-to-b from-primary/10 to-secondary/10 p-2 md:p-3">
      {phase === "revealed" && confettiEnabled && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={220}
          recycle={false}
          colors={["#00236f", "#006c49", "#f59e0b", "#b6c4ff"]}
        />
      )}

      <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Company logo" className="h-12 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-headline-lg text-on-surface">
              {phase === "revealed" ? "WINNER SELECTED" : "READY TO DRAW"}
            </h1>
            <p className="text-body-lg text-on-surface-variant mt-1">Raffle Administration · {eventTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel bg-white/70 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-label-md text-on-surface-variant">SYSTEM LIVE</span>
            <span className="text-outline-variant">|</span>
            <Ticket size={14} className="text-primary" />
            <span className="text-body-md font-semibold text-on-surface">{currentPool}</span>
          </div>
        </div>
      </div>

      <div className="card-surface max-w-4xl mx-auto overflow-hidden">
        <div className="px-8 py-5 flex justify-center border-b border-outline-variant/60">
          <span className="badge-gold">
            <Star size={12} /> LIVE DRAW
          </span>
        </div>

        <div
          className="h-52 md:h-56 flex items-center justify-center overflow-hidden relative border-b border-outline-variant/60 bg-surface-container-low/40 px-5"
          style={{ containerType: "inline-size" } as React.CSSProperties}
        >
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.p
                key="press-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: revealTransitionDuration }}
                className="text-headline-lg text-outline-variant tracking-wide"
              >
                PRESS START
              </motion.p>
            )}
            {phase === "spinning" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ pointerEvents: "none" }}>
                <style>{`
                  @keyframes marqueeY { 0% { transform: translateY(0%); } 100% { transform: translateY(-50%); } }
                  .marquee-vert { will-change: transform; }
                `}</style>

                <div
                  className="marquee-vert w-full px-4"
                  style={{
                    ['--marquee-dur' as any]: `${spinMs / 1000}s`,
                    animation: `marqueeY var(--marquee-dur) linear infinite`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    {scrollNames.map((n, i) => (
                      <p
                        key={`a-${i}`}
                        className="leading-tight font-extrabold text-primary py-2 text-center w-full"
                        style={{ fontSize: marqueeFontSize, pointerEvents: "none", whiteSpace: "nowrap" }}
                      >
                        {n}
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-col items-center">
                    {scrollNames.map((n, i) => (
                      <p
                        key={`b-${i}`}
                        className="leading-tight font-extrabold text-primary py-2 text-center w-full"
                        style={{ fontSize: marqueeFontSize, pointerEvents: "none", whiteSpace: "nowrap" }}
                      >
                        {n}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {phase === "revealed" && currentWinner && (
              <motion.div
                key="reveal"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: revealTransitionDuration }}
                className="text-center py-6 px-3"
              >
                <p
                  className="font-extrabold text-primary break-words"
                  style={{ fontSize: nameFontSize(currentWinner.employee_name) }}
                >
                  {currentWinner.employee_name}
                </p>
                <p className="text-on-surface-variant mt-2" style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
                  {currentWinner.department_name}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 py-2.5 text-center">
          <p className="text-title-lg text-on-surface">{eventTitle}</p>
          <p className="text-body-md text-on-surface-variant">
            {phase === "revealed" && currentWinner
              ? `Drawn ${new Date(currentWinner.drawn_at).toLocaleTimeString()}`
              : "Ticket # 000-000"}
          </p>
        </div>
      </div>

      {error && (
        <p className="max-w-4xl mx-auto mt-4 text-center text-body-md text-error bg-error-container/40 rounded px-4 py-2">
          {error}
        </p>
      )}
      {groupFull && phase === "idle" && (
        <p className="max-w-4xl mx-auto mt-4 text-center text-body-md text-secondary bg-secondary-container/30 rounded px-4 py-2">
          No available slot remain with open draws.
        </p>
      )}

      <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
        <Button variant="outline" disabled={phase === "spinning"} onClick={() => reset()}>
          <RotateCcw size={16} /> Reset View
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="text-on-primary"
          disabled={phase === "spinning"}
          loading={phase === "spinning"}
          onClick={handleStartDraw}
        >
          <Play size={18} />
          {phase === "spinning" ? "Drawing..." : "Start Draw"}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 card-surface p-4 rounded-lg border border-outline-variant/60 flex items-center justify-center">
            <div className="text-center">
              <p className="text-label-md text-on-surface-variant">Remaining slots</p>
              <p className="text-headline-lg text-on-surface font-extrabold mt-1">{remainingSlots}</p>
            </div>
        </div>

        <div className="md:col-span-2 card-surface p-4 rounded-lg border border-outline-variant/60">
          <p className="label-uppercase mb-2">Recent Winners</p>
          {recentWinners.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No winners yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentWinners.map((w) => (
                <li key={w.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-on-surface">{w.employee_name}</p>
                    <p className="text-body-sm text-on-surface-variant">{w.department_name}</p>
                  </div>
                  <div className="text-body-sm text-on-surface-variant">{new Date(w.drawn_at).toLocaleTimeString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default RaffleStage;

// Fisher-Yates: unbiased shuffle, unlike naive sort(() => Math.random() - 0.5).
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds the marquee sequence lap-by-lap: each "lap" is a full shuffled pass
// through every eligible name, instead of independently random picks per
// slot. This guarantees every name shows up evenly (no name gets skipped for
// a long stretch, no name repeats way more than others) and avoids the same
// name landing twice in a row, including across lap boundaries.
function generateShuffleNames(eligibleNames: string[]): string[] {
  const pool = eligibleNames.length > 0 ? eligibleNames : ["NONE"];
  const target = Math.max(50, pool.length * 6);

  if (pool.length === 1) return Array(target).fill(pool[0]);

  const out: string[] = [];
  let lastName: string | null = null;
  while (out.length < target) {
    const lap = shuffleArray(pool);
    if (lastName && lap[0] === lastName) {
      // swap the seam element so we never repeat the previous name immediately
      [lap[0], lap[1]] = [lap[1], lap[0]];
    }
    out.push(...lap);
    lastName = lap[lap.length - 1];
  }
  return out.slice(0, target);
}