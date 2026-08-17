import { create } from "zustand";
import type { DrawResult } from "@/lib/services/raffle";

export type DrawPhase = "idle" | "spinning" | "revealed";

interface RaffleStoreState {
  selectedSlotGroupId: string | null;
  phase: DrawPhase;
  currentWinner: DrawResult | null;
  previousWinner: DrawResult | null;
  history: DrawResult[];
  isFullScreen: boolean;
  error: string | null;

  setSlotGroup: (id: string | null) => void;
  startSpin: () => void;
  reveal: (winner: DrawResult) => void;
  reset: () => void;
  setFullScreen: (v: boolean) => void;
  setError: (msg: string | null) => void;
}

export const useRaffleStore = create<RaffleStoreState>((set, get) => ({
  selectedSlotGroupId: null,
  phase: "idle",
  currentWinner: null,
  previousWinner: null,
  history: [],
  isFullScreen: false,
  error: null,

  setSlotGroup: (id) => set({ selectedSlotGroupId: id, phase: "idle", currentWinner: null, error: null }),

  startSpin: () => set({ phase: "spinning", error: null }),

  reveal: (winner) =>
    set((state) => ({
      phase: "revealed",
      previousWinner: state.currentWinner,
      currentWinner: winner,
      history: [winner, ...state.history],
    })),

  reset: () => set({ phase: "idle", currentWinner: null, previousWinner: null, history: [], error: null }),

  setFullScreen: (v) => set({ isFullScreen: v }),

  setError: (msg) => set({ error: msg, phase: "idle" }),
}));
