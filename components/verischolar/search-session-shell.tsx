"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { analyzeBoardAction } from "@/app/actions";
import { AnalysisPanel } from "@/components/verischolar/analysis-panel";
import { ChatHeroState } from "@/components/verischolar/chat-hero-state";
import { ChatMessageTimeline } from "@/components/verischolar/chat-message-timeline";
import { PromptComposer } from "@/components/verischolar/prompt-composer";
import { ResearchBoard } from "@/components/verischolar/research-board";
import { INITIAL_ANALYSIS_ACTION_STATE } from "@/lib/verischolar/action-state";
import {
  buildCitationExport,
  getDashboardMetrics,
} from "@/lib/verischolar/citations";
import { SEARCH_ACTIVITY_STAGES } from "@/lib/verischolar/search-session";
import type { SearchMode, SearchResponse } from "@/lib/verischolar/types";
import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";
import { useResearchBoardStore } from "@/store/useResearchBoardStore";
import { useSearchSessionStore } from "@/store/useSearchSessionStore";

type SearchSessionShellProps = {
  query: string;
  searchMode: SearchMode;
  searchResponse: SearchResponse | null;
};

const STAGE_TIMINGS = [
  { afterMs: 0, stageId: SEARCH_ACTIVITY_STAGES[0].id },
  { afterMs: 1200, stageId: SEARCH_ACTIVITY_STAGES[1].id },
  { afterMs: 3200, stageId: SEARCH_ACTIVITY_STAGES[2].id },
  { afterMs: 6200, stageId: SEARCH_ACTIVITY_STAGES[3].id },
] as const;

function sameSelection(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every((value, index) => value === rightSorted[index]);
}

export function SearchSessionShell({
  query,
  searchMode,
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
  const navigatedWorkplaceSessionRef = useRef<string | null>(null);
  const [analysisState, analyzeAction, isAnalyzing] = useActionState(
    analyzeBoardAction,
    INITIAL_ANALYSIS_ACTION_STATE,
  );
  const [copied, setCopied] = useState(false);
  const setGlobalAnalysisState = useAnalysisStateStore(
    (state) => state.setAnalysisState,
  );
  const boardSources = useResearchBoardStore((state) => state.sources);
  const selectedIds = useResearchBoardStore((state) => state.selectedIds);
  const toggleSource = useResearchBoardStore((state) => state.toggleSource);

  useEffect(() => {
    setGlobalAnalysisState(analysisState);
  }, [analysisState, setGlobalAnalysisState]);

  useEffect(() => {
    const workplaceSessionId = analysisState.workplaceSessionId;

    if (!workplaceSessionId) {
      return;
    }

    if (navigatedWorkplaceSessionRef.current === workplaceSessionId) {
      return;
    }

    navigatedWorkplaceSessionRef.current = workplaceSessionId;
    router.push(`/workplace/${encodeURIComponent(workplaceSessionId)}`);
  }, [analysisState.workplaceSessionId, router]);

  const selectedSources = useMemo(
    () => boardSources.filter((source) => selectedIds.includes(source.id)),
    [boardSources, selectedIds],
  );
  const metrics = useMemo(
    () => getDashboardMetrics(selectedSources),
    [selectedSources],
  );
  const citationExport = useMemo(
    () => buildCitationExport(selectedSources),
    [selectedSources],
  );
  const isStale =
    analysisState.status === "success" &&
    !sameSelection(analysisState.selectedSourceIds, selectedIds);

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

    const href = `${pathname}?q=${encodeURIComponent(trimmedQuery)}${
      searchMode === "local" ? "&local=1" : ""
    }`;

    startTransition(() => {
      if (trimmedQuery === query) {
        router.replace(href, { scroll: false });
        router.refresh();
        return;
      }

      router.push(href, { scroll: false });
    });
  }

  async function copyCitations() {
    if (!citationExport) {
      return;
    }

    await navigator.clipboard.writeText(citationExport);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const hasConversation = turns.length > 0 || Boolean(searchResponse);
  const composerQuery = pendingSearch?.query ?? searchResponse?.query ?? query;
  const isComposerPending = isRouting || Boolean(pendingSearch);

  return (
    <section
      className={`mx-auto flex w-full flex-1 flex-col px-4 pt-3 sm:px-6 lg:px-10 
        ${
        hasConversation ? "lg:pr-[27rem] pb-32" : "pb-6"
      }`}
    >
      <div
        className={`mx-auto flex w-full flex-1 flex-col 
          ${
          hasConversation ? "max-w-[1000px]" : "max-w-[1120px]"
        }`}
      >
        {hasConversation ? (
          <div className="flex-1 mt-21">
            <div className="overflow-y-auto rounded-[2rem] border border-[var(--line)] bg-[rgba(255,251,243,0.52)] p-3 shadow-[0_28px_74px_rgba(91,64,35,0.08)] backdrop-blur-xl sm:p-4">
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
          <div className="mt-25 mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[1120px] flex-col items-center gap-4">
            <div className="flex flex-col gap-15">
              <div className="mt-21 flex flex-1 items-center justify-center pb-2">
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
          </div>
        )}
      </div>

      {/*Sidebar*/}
      {hasConversation ? (
        <aside className="ui-enter-right fixed bottom-0 right-5 top-25 z-30 hidden w-[27rem] overflow-y-auto border-l border-[var(--line)] bg-[linear-gradient(180deg,rgba(252,248,242,0.97),rgba(247,240,230,0.94))] px-3 py-3 shadow-[-14px_0_36px_rgba(53,33,19,0.06)] backdrop-blur-xl lg:block rounded-4xl
        scrollbar-thin scrollbar-thumb-[var(--muted)] scrollbar-track-transparenthover:scrollbar-thumb-[var(--muted)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--muted)]">
          <div className="space-y-2">
            
            <div className=" pb-2">
              <p className="px-1 py-2 text-[1rem] tracking-[0.2em] text-[var(--muted)] uppercase">
                Analysis
              </p>
              <AnalysisPanel
                query={composerQuery}
                searchMode={searchMode}
                selectedSourceIds={selectedIds}
                action={analyzeAction}
                actionState={analysisState}
                isPending={isAnalyzing}
                isStale={isStale}
                metrics={metrics}
              />
            </div>

            <div className="space-y-2">
              <ResearchBoard
                selectedSources={selectedSources}
                localRatio={metrics.ratioLocal}
                citationExport={citationExport}
                onToggle={toggleSource}
                onCopyCitations={copyCitations}
                copied={copied}
              />
            </div>

          </div>
        </aside>
      ) : null}

      {hasConversation ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-6 lg:px-10 lg:pr-[27rem]">
          <div className="mx-auto w-full max-w-[1000px]">
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
