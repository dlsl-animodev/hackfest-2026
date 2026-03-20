"use client";

import { create } from "zustand";

import {
  SEARCH_ACTIVITY_STAGES,
  type PendingSearchMetadata,
  type SearchActivityStageId,
  type SearchAssistantCompletedTurn,
  type SearchAssistantPendingTurn,
  type SearchConversationTurn,
  type SearchUserTurn,
} from "@/lib/verischolar/search-session";
import type { SearchResponse } from "@/lib/verischolar/types";

type SearchSessionStore = {
  turns: SearchConversationTurn[];
  pendingSearch: PendingSearchMetadata | null;
  latestCompletedTurnId: string | null;
  startSearch: (rawQuery: string) => string | null;
  setPendingStage: (stageId: SearchActivityStageId) => void;
  syncCompletedSearch: (response: SearchResponse) => void;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function buildUserTurn(query: string, searchId: string, createdAt: number) {
  return {
    id: createId("user-turn"),
    searchId,
    query,
    createdAt,
    role: "user",
  } satisfies SearchUserTurn;
}

function buildPendingAssistantTurn(
  query: string,
  searchId: string,
  createdAt: number,
) {
  return {
    id: createId("assistant-turn"),
    searchId,
    query,
    createdAt,
    role: "assistant",
    status: "pending",
  } satisfies SearchAssistantPendingTurn;
}

function buildCompletedAssistantTurn(
  query: string,
  searchId: string,
  createdAt: number,
  response: SearchResponse,
) {
  return {
    id: createId("assistant-turn"),
    searchId,
    query,
    createdAt,
    role: "assistant",
    status: "completed",
    completedAt: Date.now(),
    response,
  } satisfies SearchAssistantCompletedTurn;
}

function isPendingAssistantTurn(
  turn: SearchConversationTurn,
): turn is SearchAssistantPendingTurn {
  return turn.role === "assistant" && turn.status === "pending";
}

function isCompletedAssistantTurn(
  turn: SearchConversationTurn,
): turn is SearchAssistantCompletedTurn {
  return turn.role === "assistant" && turn.status === "completed";
}

export const useSearchSessionStore = create<SearchSessionStore>((set) => ({
  turns: [],
  pendingSearch: null,
  latestCompletedTurnId: null,
  startSearch: (rawQuery) => {
    const query = rawQuery.trim();

    if (!query) {
      return null;
    }

    const searchId = createId("search");
    const createdAt = Date.now();

    set((state) => ({
      turns: [
        ...state.turns,
        buildUserTurn(query, searchId, createdAt),
        buildPendingAssistantTurn(query, searchId, createdAt),
      ],
      pendingSearch: {
        searchId,
        query,
        startedAt: createdAt,
        stageId: SEARCH_ACTIVITY_STAGES[0].id,
      },
    }));

    return searchId;
  },
  setPendingStage: (stageId) => {
    set((state) => {
      if (!state.pendingSearch || state.pendingSearch.stageId === stageId) {
        return state;
      }

      return {
        pendingSearch: {
          ...state.pendingSearch,
          stageId,
        },
      };
    });
  },
  syncCompletedSearch: (response) => {
    set((state) => {
      const pendingEntry = [...state.turns]
        .map((turn, index) => [turn, index] as const)
        .reverse()
        .find(
          (
            entry,
          ): entry is readonly [SearchAssistantPendingTurn, number] =>
            isPendingAssistantTurn(entry[0]) && entry[0].query === response.query,
        );

      if (pendingEntry) {
        const [pendingTurn, pendingTurnIndex] = pendingEntry;
        const completedTurn = {
          ...pendingTurn,
          status: "completed",
          completedAt: Date.now(),
          response,
        } satisfies SearchAssistantCompletedTurn;
        const nextTurns = [...state.turns];

        nextTurns[pendingTurnIndex] = completedTurn;

        return {
          turns: nextTurns,
          pendingSearch:
            state.pendingSearch?.searchId === pendingTurn.searchId
              ? null
              : state.pendingSearch,
          latestCompletedTurnId: completedTurn.id,
        };
      }

      const lastTurn = state.turns.at(-1);

      if (
        lastTurn &&
        isCompletedAssistantTurn(lastTurn) &&
        lastTurn.query === response.query
      ) {
        return state;
      }

      const createdAt = Date.now();
      const searchId = createId("search");
      const userTurn = buildUserTurn(response.query, searchId, createdAt);
      const assistantTurn = buildCompletedAssistantTurn(
        response.query,
        searchId,
        createdAt,
        response,
      );

      return {
        turns: [...state.turns, userTurn, assistantTurn],
        latestCompletedTurnId: assistantTurn.id,
      };
    });
  },
}));
