import { Bot, User2 } from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  m,
  useReducedMotion,
} from "framer-motion";

import { BrandGlyph } from "@/components/verischolar/icons";
import { SearchActivityBlock } from "@/components/verischolar/search-activity-block";
import { WorkspaceClient } from "@/components/verischolar/workspace-client";
import {
  CHAT_MOTION,
  getSettleMotion,
} from "@/lib/verischolar/motion";
import {
  buildHydratedSearchId,
  buildHydratedTurnId,
  type PendingSearchMetadata,
  type SearchConversationTurn,
} from "@/lib/verischolar/search-session";
import type { SearchResponse } from "@/lib/verischolar/types";

type ChatMessageTimelineProps = {
  turns: SearchConversationTurn[];
  pendingSearch: PendingSearchMetadata | null;
  initialQuery?: string;
  initialResponse?: SearchResponse | null;
};

type SeedUserTurn = {
  id: string;
  searchId: string;
  role: "user";
  query: string;
};

type SeedAssistantCompletedTurn = {
  id: string;
  searchId: string;
  role: "assistant";
  status: "completed";
  query: string;
  response: SearchResponse;
};

type DisplayTurn =
  | SearchConversationTurn
  | SeedUserTurn
  | SeedAssistantCompletedTurn;

type AssistantDisplayTurn = Extract<DisplayTurn, { role: "assistant" }>;

function getTurnTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function AssistantTurnCard({
  turn,
  pendingSearch,
  animateOnMount,
}: {
  turn: AssistantDisplayTurn;
  pendingSearch: PendingSearchMetadata | null;
  animateOnMount: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const assistantEntry = getSettleMotion(
    Boolean(reduceMotion),
    animateOnMount ? CHAT_MOTION.delays.assistant : 0,
    18,
  );
  const isPending = turn.status === "pending";
  const activeStageId =
    isPending && pendingSearch?.searchId === turn.searchId
      ? pendingSearch.stageId
      : "understanding-query";
  const startedAt =
    isPending && pendingSearch?.searchId === turn.searchId
      ? pendingSearch.startedAt
      : "createdAt" in turn
        ? turn.createdAt
        : 0;
  const timestampLabel =
    "completedAt" in turn
      ? getTurnTimestamp(turn.completedAt)
      : "createdAt" in turn
        ? getTurnTimestamp(turn.createdAt)
        : "Current run";

  return (
    <m.div
      layout
      layoutId={`assistant-shell-${turn.searchId}`}
      className="overflow-hidden rounded-[2.1rem] border border-[var(--line)] bg-[rgba(255,255,255,0.6)] p-4 shadow-[0_30px_80px_rgba(91,64,35,0.08)] backdrop-blur-[1px] sm:p-5"
      initial={animateOnMount ? assistantEntry.initial : false}
      animate={assistantEntry.animate}
      transition={{ layout: CHAT_MOTION.layout }}
    >
      <m.div
        layout="position"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(118,96,72,0.12)] pb-4"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(162,119,79,0.16)] bg-[rgba(255,245,232,0.9)] text-[var(--accent)] shadow-[0_14px_34px_rgba(97,68,38,0.08)]">
            <BrandGlyph className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.72rem] tracking-[0.18em] text-[var(--muted)] uppercase">
              VeriScholar
            </p>
            <p className="mt-1 text-sm text-[color:rgba(82,67,56,0.88)]">
              {isPending
                ? "Turning your query into a ranked literature board."
                : "Research board ready for review."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPending && "response" in turn ? (
            <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
              {turn.response.fromCache
                ? "Supabase cache hit"
                : "Live provider fetch"}
            </span>
          ) : null}
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
            {timestampLabel}
          </span>
        </div>
      </m.div>

      <div className="pt-4">
        <AnimatePresence initial={false} mode="sync">
          {isPending ? (
            <m.div
              key="assistant-pending"
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{
                duration: reduceMotion
                  ? CHAT_MOTION.durations.fast
                  : CHAT_MOTION.durations.base,
                ease: CHAT_MOTION.ease,
              }}
            >
              <SearchActivityBlock
                stageId={activeStageId}
                startedAt={startedAt}
              />
            </m.div>
          ) : (
            <m.div
              key="assistant-completed"
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduceMotion
                  ? CHAT_MOTION.durations.fast
                  : CHAT_MOTION.durations.base,
                ease: CHAT_MOTION.ease,
              }}
            >
              <WorkspaceClient
                searchResponse={turn.response}
                animateOnMount={animateOnMount}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
}

export function ChatMessageTimeline({
  turns,
  pendingSearch,
  initialQuery,
  initialResponse,
}: ChatMessageTimelineProps) {
  const initialSearchId = initialQuery
    ? buildHydratedSearchId(initialQuery)
    : null;
  const displayTurns: DisplayTurn[] =
    turns.length === 0 && initialResponse && initialQuery && initialSearchId
      ? [
          {
            id: buildHydratedTurnId("user", initialQuery),
            searchId: initialSearchId,
            role: "user",
            query: initialQuery,
          },
          {
            id: buildHydratedTurnId("assistant", initialQuery),
            searchId: initialSearchId,
            role: "assistant",
            status: "completed",
            query: initialQuery,
            response: initialResponse,
          },
        ]
      : turns;

  const latestSearchId = displayTurns.at(-1)?.searchId;
  const usingSeedTurns = turns.length === 0 && Boolean(initialResponse && initialQuery);
  const suppressHydrationMotion = Boolean(
    initialSearchId &&
      initialResponse &&
      initialQuery &&
      turns.length === 2 &&
      turns.every((turn) => turn.searchId === initialSearchId),
  );

  return (
    <LazyMotion features={CHAT_MOTION.features}>
      <MotionConfig reducedMotion="user">
        <section className="relative">
          <div className="pointer-events-none absolute bottom-0 left-6 top-0 hidden w-px bg-[linear-gradient(180deg,rgba(162,119,79,0),rgba(162,119,79,0.2),rgba(162,119,79,0))] lg:block" />

          <div className="space-y-6">
            {displayTurns.map((turn) => {
              const isUser = turn.role === "user";
              const shouldAnimateTurn = Boolean(
                latestSearchId &&
                  turn.searchId === latestSearchId &&
                  !usingSeedTurns &&
                  !suppressHydrationMotion,
              );

              return (
                <m.article
                  key={turn.id}
                  layout="position"
                  transition={{ layout: CHAT_MOTION.layout }}
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
                      <AnimatedUserBubble
                        turn={turn}
                        animateOnMount={shouldAnimateTurn}
                      />
                    ) : (
                      <AssistantTurnCard
                        turn={turn}
                        pendingSearch={pendingSearch}
                        animateOnMount={shouldAnimateTurn}
                      />
                    )}
                  </div>
                </m.article>
              );
            })}
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}

function AnimatedUserBubble({
  turn,
  animateOnMount,
}: {
  turn: Extract<DisplayTurn, { role: "user" }>;
  animateOnMount: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const entry = getSettleMotion(Boolean(reduceMotion), 0, 16);

  return (
    <m.div
      className="ml-auto overflow-hidden rounded-[1.8rem] border border-[rgba(47,29,18,0.1)] bg-[linear-gradient(145deg,rgba(47,29,18,0.95),rgba(67,44,26,0.92))] px-5 py-4 text-[var(--bg)] shadow-[0_24px_62px_rgba(38,24,13,0.16)]"
      initial={animateOnMount ? entry.initial : false}
      animate={entry.animate}
    >
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
    </m.div>
  );
}
