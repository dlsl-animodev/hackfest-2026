"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { m, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

import { analyzeBoardAction } from "@/app/actions";
import { AnalysisPanel } from "@/components/verischolar/analysis-panel";
import { ResearchBoard } from "@/components/verischolar/research-board";
import { ResultCard } from "@/components/verischolar/result-card";
import { INITIAL_ANALYSIS_ACTION_STATE } from "@/lib/verischolar/action-state";
import {
  buildCitationExport,
  getDashboardMetrics,
} from "@/lib/verischolar/citations";
import { getWorkspaceRevealMotion } from "@/lib/verischolar/motion";
import type { ResearchSource, SearchResponse } from "@/lib/verischolar/types";
import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";

type WorkspaceClientProps = {
  searchResponse: SearchResponse;
  animateOnMount?: boolean;
};

function getInitialSelection(sources: ResearchSource[]) {
  return [...sources]
    .sort((left, right) => right.credibility.score - left.credibility.score)
    .slice(0, 3)
    .map((source) => source.id);
}

function sameSelection(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every((value, index) => value === rightSorted[index]);
}

export function WorkspaceClient({
  searchResponse,
  animateOnMount = false,
}: WorkspaceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    query,
    sources,
    expandedQuery,
    overallFindingsSummary,
    fromCache,
    warnings,
  } = searchResponse;
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    getInitialSelection(sources),
  );
  const [analysisState, analyzeAction, isAnalyzing] = useActionState(
    analyzeBoardAction,
    INITIAL_ANALYSIS_ACTION_STATE,
  );
  const [copied, setCopied] = useState(false);
  const [, startBoardTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const setGlobalAnalysisState = useAnalysisStateStore(
    (state) => state.setAnalysisState,
  );

  useEffect(() => {
    setGlobalAnalysisState(analysisState);
  }, [analysisState, setGlobalAnalysisState]);

  const selectedSources = sources.filter((source) =>
    selectedIds.includes(source.id),
  );
  const metrics = getDashboardMetrics(selectedSources);
  const citationExport = buildCitationExport(selectedSources);
  const isStale =
    analysisState.status === "success" &&
    !sameSelection(analysisState.selectedSourceIds, selectedIds);
  const insightsLabel =
    sources.length === 0
      ? "No results yet"
      : `${sources.length} ranked sources`;
  const workspaceMotion = getWorkspaceRevealMotion(Boolean(reduceMotion));

  function toggleSource(sourceId: string) {
    startBoardTransition(() => {
      setSelectedIds((currentIds) =>
        currentIds.includes(sourceId)
          ? currentIds.filter((currentId) => currentId !== sourceId)
          : [...currentIds, sourceId],
      );
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

  function buildPhilippineOnlyQuery(baseQuery: string) {
    const trimmed = baseQuery.trim();

    if (!trimmed) {
      return "Philippines-based peer reviewed research";
    }

    return `${trimmed} AND (Philippines OR Philippine OR \"Metro Manila\" OR Luzon OR Visayas OR Mindanao OR \"University of the Philippines\" OR \".edu.ph\" OR \".gov.ph\")`;
  }

  function handleFindPhilippineOnly() {
    const nextQuery = buildPhilippineOnlyQuery(query);

    router.push(`${pathname}?q=${encodeURIComponent(nextQuery)}`, {
      scroll: false,
    });
  }

  return (
    <m.section
      className="space-y-5"
      initial={animateOnMount ? workspaceMotion.initial : false}
      animate={workspaceMotion.animate}
    >
      <div className="grid gap-4 rounded-[1.7rem] border border-[var(--line)] bg-[rgba(255,255,255,0.62)] px-4 py-4 shadow-[0_20px_54px_rgba(108,82,54,0.07)] sm:px-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
        <div className="space-y-4">
          <p className="text-[0.84rem] tracking-[0.18em] text-[var(--muted)] uppercase">
            Query
          </p>
          <h2 className="type-display max-w-[20ch] text-[1.7rem] leading-[1.15] text-[var(--ink)] sm:text-[1.9rem]">
            {query}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[0.84rem] text-[var(--muted)]">
            {expandedQuery && expandedQuery !== query ? (
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5">
                Expanded search: {expandedQuery}
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--line)] px-3 py-1.5">
              {fromCache ? "Supabase cache hit" : "Live provider fetch"}
            </span>
          </div>

          {overallFindingsSummary ? (
            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-4 py-3">
              <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                Overall findings summary
              </p>
              <p className="mt-2 text-[1.02rem] leading-6 text-[color:rgba(82,67,56,0.9)]">
                {overallFindingsSummary}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          {[
            { label: "Sources", value: insightsLabel },
            { label: "Pinned", value: `${selectedSources.length} on board` },
            { label: "Local", value: `${metrics.ratioLocal}%` },
            { label: "Flagged", value: `${metrics.flaggedCount} risk` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-4 py-3"
            >
              <p className="text-[0.82rem] tracking-[0.14em] text-[var(--muted)] uppercase">
                {stat.label}
              </p>
              <p className="mt-2 text-[1.02rem] text-[var(--ink)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-[1.3rem] border border-[rgba(182,131,67,0.2)] bg-[rgba(255,249,240,0.9)] px-4 py-3 text-sm leading-6 text-[color:rgba(93,66,37,0.88)]"
            >
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_340px] xl:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.5)] px-4 py-4 shadow-[0_18px_48px_rgba(94,68,44,0.05)]">
            <div>
              <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                Source library
              </p>
              <h3 className="mt-2 type-display text-[1.45rem] leading-tight text-[var(--ink)]">
                Compare evidence, then pin only what survives scrutiny.
              </h3>
            </div>
            <p className="max-w-[34rem] text-[1.02rem] leading-6 text-[color:rgba(82,67,56,0.84)]">
              Results are ranked by credibility, citation momentum, venue
              quality, and recency so the strongest candidates surface faster.
            </p>

            <button
              type="button"
              onClick={handleFindPhilippineOnly}
              className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-4 py-2 text-[0.82rem] tracking-[0.12em] text-[var(--muted)] uppercase transition-colors duration-200 hover:border-[rgba(93,127,99,0.45)] hover:bg-[rgba(93,127,99,0.08)]"
            >
              Find Local Papers
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <ResultCard
                key={source.id}
                source={source}
                selected={selectedIds.includes(source.id)}
                onToggle={toggleSource}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[6.35rem]">
          <ResearchBoard
            selectedSources={selectedSources}
            localRatio={metrics.ratioLocal}
            citationExport={citationExport}
            onToggle={toggleSource}
            onCopyCitations={copyCitations}
            copied={copied}
          />

          <AnalysisPanel
            query={query}
            selectedSourceIds={selectedIds}
            action={analyzeAction}
            actionState={analysisState}
            isPending={isAnalyzing}
            isStale={isStale}
            metrics={metrics}
          />
        </aside>
      </div>
    </m.section>
  );
}
