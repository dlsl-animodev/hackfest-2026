"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ChatHeroState } from "@/components/verischolar/chat-hero-state";
import { ChatMessageTimeline } from "@/components/verischolar/chat-message-timeline";
import { PromptComposer } from "@/components/verischolar/prompt-composer";
import { SEARCH_ACTIVITY_STAGES } from "@/lib/verischolar/search-session";
import type { SearchResponse } from "@/lib/verischolar/types";
import { useSearchSessionStore } from "@/store/useSearchSessionStore";

type SearchSessionShellProps = {
  query: string;
  searchResponse: SearchResponse | null;
};

const STAGE_TIMINGS = [
  { afterMs: 0, stageId: SEARCH_ACTIVITY_STAGES[0].id },
  { afterMs: 1200, stageId: SEARCH_ACTIVITY_STAGES[1].id },
  { afterMs: 3200, stageId: SEARCH_ACTIVITY_STAGES[2].id },
  { afterMs: 6200, stageId: SEARCH_ACTIVITY_STAGES[3].id },
] as const;

export function SearchSessionShell({
  query,
  searchResponse,
}: SearchSessionShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRouting, startTransition] = useTransition();
  const turns = useSearchSessionStore((state) => state.turns);
  const pendingSearch = useSearchSessionStore((state) => state.pendingSearch);
  const startSearch = useSearchSessionStore((state) => state.startSearch);
  const setPendingStage = useSearchSessionStore(
    (state) => state.setPendingStage,
  );
  const syncCompletedSearch = useSearchSessionStore(
    (state) => state.syncCompletedSearch,
  );
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!searchResponse) {
      return;
    }

    syncCompletedSearch(searchResponse);
  }, [searchResponse, syncCompletedSearch]);

  useEffect(() => {
    if (!pendingSearch) {
      return;
    }

    const startedAt = pendingSearch.startedAt;
    const intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const nextStage =
        [...STAGE_TIMINGS].reverse().find((entry) => elapsedMs >= entry.afterMs)
          ?.stageId ?? STAGE_TIMINGS[0].stageId;

      setPendingStage(nextStage);
    }, 300);

    return () => window.clearInterval(intervalId);
  }, [pendingSearch, setPendingStage]);

  const lastTurn = turns.at(-1);
  const scrollSignal = useMemo(() => {
    if (!lastTurn) {
      return "empty";
    }

    if (lastTurn.role === "assistant" && lastTurn.status === "completed") {
      return `${lastTurn.id}:${lastTurn.completedAt}`;
    }

    if (lastTurn.role === "assistant") {
      return `${lastTurn.id}:pending`;
    }

    return `${lastTurn.id}:${lastTurn.createdAt}`;
  }, [lastTurn]);

  useEffect(() => {
    // Keep the viewport pinned while loading, but stop auto-jumping once results are done.
    if (!pendingSearch || !turns.length) {
      return;
    }

    window.requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [pendingSearch, scrollSignal, turns.length]);

  function handleSubmitQuery(rawQuery: string) {
    const trimmedQuery = rawQuery.trim();

    if (!trimmedQuery) {
      return;
    }

    const searchId = startSearch(trimmedQuery);

    if (!searchId) {
      return;
    }

    const href = `${pathname}?q=${encodeURIComponent(trimmedQuery)}`;

    startTransition(() => {
      if (trimmedQuery === query) {
        router.replace(href, { scroll: false });
        router.refresh();
        return;
      }

      router.push(href, { scroll: false });
    });
  }

  const hasConversation = turns.length > 0 || Boolean(searchResponse);
  const composerQuery = pendingSearch?.query ?? searchResponse?.query ?? query;
  const isComposerPending = isRouting || Boolean(pendingSearch);

  return (
    <section
      className={`mx-auto flex w-full flex-1 flex-col px-4 pt-3 sm:px-6 lg:px-10 ${
        hasConversation ? "pb-32" : "pb-6"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col">
        {hasConversation ? (
          <div className="flex-1">
            <div className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,251,243,0.52)] p-3 shadow-[0_28px_74px_rgba(91,64,35,0.08)] backdrop-blur-xl sm:p-4">
              <ChatMessageTimeline
                turns={turns}
                pendingSearch={pendingSearch}
                initialQuery={query}
                initialResponse={turns.length === 0 ? searchResponse : null}
              />
              <div ref={bottomAnchorRef} />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[1120px] flex-col justify-end gap-4">
            <div className="flex flex-1 items-center justify-center pb-2">
              <ChatHeroState />
            </div>
            <div className="rounded-[1.75rem] border border-[rgba(118,96,72,0.14)] bg-[rgba(255,250,244,0.66)] p-3 shadow-[0_20px_52px_rgba(91,64,35,0.08)] backdrop-blur-xl sm:p-3.5">
              <PromptComposer
                initialQuery={composerQuery}
                compact={false}
                isPending={isComposerPending}
                onSubmitQuery={handleSubmitQuery}
              />
            </div>
          </div>
        )}
      </div>

      {hasConversation ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="pointer-events-auto rounded-[1.9rem] border border-[rgba(118,96,72,0.16)] bg-[rgba(246,240,231,0.82)] p-2.5 shadow-[0_-22px_70px_rgba(91,64,35,0.12)] backdrop-blur-2xl sm:p-3">
              <PromptComposer
                initialQuery={composerQuery}
                compact
                isPending={isComposerPending}
                onSubmitQuery={handleSubmitQuery}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
