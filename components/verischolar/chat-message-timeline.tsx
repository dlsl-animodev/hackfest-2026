import { Bot, User2 } from "lucide-react";

import { BrandGlyph } from "@/components/verischolar/icons";
import { SearchActivityBlock } from "@/components/verischolar/search-activity-block";
import { WorkspaceClient } from "@/components/verischolar/workspace-client";
import type {
  PendingSearchMetadata,
  SearchAssistantPendingTurn,
  SearchConversationTurn,
} from "@/lib/verischolar/search-session";
import type { SearchResponse } from "@/lib/verischolar/types";

type ChatMessageTimelineProps = {
  turns: SearchConversationTurn[];
  pendingSearch: PendingSearchMetadata | null;
  initialQuery?: string;
  initialResponse?: SearchResponse | null;
};

function getTurnTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function PendingAssistantMessage({
  turn,
  pendingSearch,
}: {
  turn: SearchAssistantPendingTurn;
  pendingSearch: PendingSearchMetadata | null;
}) {
  const activeStageId =
    pendingSearch?.searchId === turn.searchId
      ? pendingSearch.stageId
      : "understanding-query";
  const startedAt =
    pendingSearch?.searchId === turn.searchId
      ? pendingSearch.startedAt
      : turn.createdAt;

  return (
    <div className="space-y-4 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.64)] p-4 shadow-[0_26px_70px_rgba(91,64,35,0.08)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(162,119,79,0.16)] bg-[rgba(255,245,232,0.9)] text-[var(--accent)] shadow-[0_14px_34px_rgba(97,68,38,0.08)]">
            <BrandGlyph className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.72rem] tracking-[0.18em] text-[var(--muted)] uppercase">
              VeriScholar
            </p>
            <p className="mt-1 text-sm text-[color:rgba(82,67,56,0.88)]">
              Turning your query into a ranked literature board.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
          {getTurnTimestamp(turn.createdAt)}
        </span>
      </div>

      <SearchActivityBlock stageId={activeStageId} startedAt={startedAt} />
    </div>
  );
}

export function ChatMessageTimeline({
  turns,
  pendingSearch,
  initialQuery,
  initialResponse,
}: ChatMessageTimelineProps) {
  const displayTurns =
    turns.length === 0 && initialResponse && initialQuery
      ? [
          {
            id: `seed-user-${initialQuery}`,
            role: "user" as const,
            query: initialQuery,
          },
          {
            id: `seed-assistant-${initialQuery}`,
            role: "assistant" as const,
            status: "completed" as const,
            response: initialResponse,
          },
        ]
      : turns;

  return (
    <section className="relative">
      <div className="pointer-events-none absolute bottom-0 left-6 top-0 hidden w-px bg-[linear-gradient(180deg,rgba(162,119,79,0),rgba(162,119,79,0.2),rgba(162,119,79,0))] lg:block" />

      <div className="space-y-6">
        {displayTurns.map((turn) => {
          const isUser = turn.role === "user";

          return (
            <article
              key={turn.id}
              className={`relative flex gap-4 ${
                isUser ? "justify-end" : "items-start"
              }`}
            >
              {!isUser ? (
                <span className="hidden h-12 w-12 items-center justify-center rounded-full border border-[rgba(162,119,79,0.14)] bg-[rgba(255,252,245,0.84)] text-[var(--accent)] shadow-[0_12px_30px_rgba(91,64,35,0.08)] lg:inline-flex">
                  <Bot className="h-4 w-4" />
                </span>
              ) : null}

              <div
                className={`min-w-0 ${
                  isUser ? "w-full max-w-[640px]" : "w-full"
                }`}
              >
                {isUser ? (
                  <div className="ml-auto overflow-hidden rounded-[1.8rem] border border-[rgba(47,29,18,0.1)] bg-[linear-gradient(145deg,rgba(47,29,18,0.95),rgba(67,44,26,0.92))] px-5 py-4 text-[var(--bg)] shadow-[0_24px_62px_rgba(38,24,13,0.16)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-[0.72rem] tracking-[0.18em] text-[rgba(255,241,221,0.72)] uppercase">
                        <User2 className="h-3.5 w-3.5" />
                        You
                      </span>
                      <span className="text-xs text-[rgba(255,241,221,0.62)]">
                        {"createdAt" in turn
                          ? getTurnTimestamp(turn.createdAt)
                          : "Current run"}
                      </span>
                    </div>
                    <p className="mt-3 text-base leading-8">{turn.query}</p>
                  </div>
                ) : turn.status === "pending" ? (
                  <PendingAssistantMessage
                    turn={turn}
                    pendingSearch={pendingSearch}
                  />
                ) : (
                  <div className="space-y-4 rounded-[2.2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4 shadow-[0_30px_80px_rgba(91,64,35,0.08)] sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(118,96,72,0.12)] pb-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(162,119,79,0.16)] bg-[rgba(255,245,232,0.9)] text-[var(--accent)] shadow-[0_14px_34px_rgba(97,68,38,0.08)]">
                          <BrandGlyph className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-[0.72rem] tracking-[0.18em] text-[var(--muted)] uppercase">
                            VeriScholar
                          </p>
                          <p className="mt-1 text-sm text-[color:rgba(82,67,56,0.88)]">
                            Research board ready for review.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
                          {turn.response.fromCache
                            ? "Supabase cache hit"
                            : "Live provider fetch"}
                        </span>
                        <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
                          {"completedAt" in turn
                            ? getTurnTimestamp(turn.completedAt)
                            : "Current run"}
                        </span>
                      </div>
                    </div>

                    <WorkspaceClient searchResponse={turn.response} />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
