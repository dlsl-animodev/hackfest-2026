import { create } from "zustand";

import type { ResearchSource } from "@/lib/verischolar/types";

type ResearchBoardState = {
  query: string;
  sources: ResearchSource[];
  selectedIds: string[];
  initializeBoard: (query: string, sources: ResearchSource[]) => void;
  toggleSource: (sourceId: string) => void;
};

function getInitialSelection(sources: ResearchSource[]) {
  return [...sources]
    .sort((left, right) => right.credibility.score - left.credibility.score)
    .slice(0, 3)
    .map((source) => source.id);
}

export const useResearchBoardStore = create<ResearchBoardState>((set, get) => ({
  query: "",
  sources: [],
  selectedIds: [],
  initializeBoard: (query, sources) => {
    const current = get();
    const currentSignature = current.sources.map((source) => source.id).join("|");
    const nextSignature = sources.map((source) => source.id).join("|");

    if (current.query === query && currentSignature === nextSignature) {
      return;
    }

    set({
      query,
      sources,
      selectedIds: getInitialSelection(sources),
    });
  },
  toggleSource: (sourceId) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(sourceId)
        ? state.selectedIds.filter((currentId) => currentId !== sourceId)
        : [...state.selectedIds, sourceId],
    }));
  },
}));
