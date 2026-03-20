import type { SearchResponse } from "@/lib/verischolar/types";

export const SEARCH_ACTIVITY_STAGES = [
  {
    id: "understanding-query",
    label: "Understanding query",
    detail: "Distilling your topic into searchable academic signals.",
  },
  {
    id: "searching-providers",
    label: "Searching providers",
    detail: "Checking Semantic Scholar and OpenAlex coverage.",
  },
  {
    id: "checking-credibility",
    label: "Checking credibility",
    detail: "Reviewing metadata, venue quality, and retraction risk.",
  },
  {
    id: "preparing-board",
    label: "Preparing research board",
    detail: "Ranking sources and assembling your working board.",
  },
] as const;

export type SearchActivityStageId =
  (typeof SEARCH_ACTIVITY_STAGES)[number]["id"];

type BaseTurn = {
  id: string;
  searchId: string;
  query: string;
  createdAt: number;
};

export type SearchUserTurn = BaseTurn & {
  role: "user";
};

export type SearchAssistantPendingTurn = BaseTurn & {
  role: "assistant";
  status: "pending";
};

export type SearchAssistantCompletedTurn = BaseTurn & {
  role: "assistant";
  status: "completed";
  completedAt: number;
  response: SearchResponse;
};

export type SearchConversationTurn =
  | SearchUserTurn
  | SearchAssistantPendingTurn
  | SearchAssistantCompletedTurn;

export type PendingSearchMetadata = {
  searchId: string;
  query: string;
  startedAt: number;
  stageId: SearchActivityStageId;
};
