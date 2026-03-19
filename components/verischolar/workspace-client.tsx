"use client";

import { useActionState, useState, useTransition } from "react";

import { analyzeBoardAction } from "@/app/actions";
import { AnalysisPanel } from "@/components/verischolar/analysis-panel";
import { ResearchBoard } from "@/components/verischolar/research-board";
import { ResultCard } from "@/components/verischolar/result-card";
import { INITIAL_ANALYSIS_ACTION_STATE } from "@/lib/verischolar/action-state";
import {
  buildCitationExport,
  getDashboardMetrics,
} from "@/lib/verischolar/citations";
import type { ResearchSource, SearchResponse } from "@/lib/verischolar/types";

type WorkspaceClientProps = {
  searchResponse: SearchResponse;
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

export function WorkspaceClient({ searchResponse }: WorkspaceClientProps) {
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

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[1.7rem] border border-[var(--line)] bg-[rgba(255,255,255,0.56)] px-5 py-4 shadow-[0_20px_54px_rgba(108,82,54,0.07)] lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
            Query
          </p>
          <h2 className="mt-3 type-display text-[1.9rem] leading-tight text-[var(--ink)]">
            {query}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
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
            <div className="mt-4 rounded-[1rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-2.5">
              <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                Overall findings summary
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:rgba(82,67,56,0.9)]">
                {overallFindingsSummary}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                {stat.label}
              </p>
              <p className="mt-2 text-sm text-[var(--ink)]">{stat.value}</p>
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr_1fr]">
        <div className="space-y-4">
          {sources.map((source) => (
            <ResultCard
              key={source.id}
              source={source}
              selected={selectedIds.includes(source.id)}
              onToggle={toggleSource}
            />
          ))}
        </div>

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
      </div>
    </section>
  );
}
