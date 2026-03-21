import type { AnalysisResult } from "@/lib/verischolar/types";

export type AnalysisActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  analysis: AnalysisResult | null;
  selectedSourceIds: string[];
  workplaceSessionId: string | null;
};

export const INITIAL_ANALYSIS_ACTION_STATE: AnalysisActionState = {
  status: "idle",
  message: null,
  analysis: null,
  selectedSourceIds: [],
  workplaceSessionId: null,
};
