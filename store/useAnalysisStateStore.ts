import { create } from "zustand";
import { AnalysisActionState } from "@/lib/verischolar/action-state";

interface AnalysisStateStore {
    analysisState: AnalysisActionState | null;
    setAnalysisState: (state: AnalysisActionState) => void;
    clearAnalysisState: () => void;
}

export const useAnalysisStateStore = create<AnalysisStateStore>((set) => ({
    analysisState: null,
    setAnalysisState: (state) => set({ analysisState: state }),
    clearAnalysisState: () => set({ analysisState: null }),
}));
