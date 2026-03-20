import {
  BrainCircuit,
  DatabaseZap,
  LayoutPanelTop,
  ShieldCheck,
} from "lucide-react";

import {
  SEARCH_ACTIVITY_STAGES,
  type SearchActivityStageId,
} from "@/lib/verischolar/search-session";

type SearchActivityBlockProps = {
  stageId: SearchActivityStageId;
  startedAt: number;
};

const STAGE_ICONS = {
  "understanding-query": BrainCircuit,
  "searching-providers": DatabaseZap,
  "checking-credibility": ShieldCheck,
  "preparing-board": LayoutPanelTop,
} satisfies Record<SearchActivityStageId, typeof BrainCircuit>;

export function SearchActivityBlock({
  stageId,
  startedAt,
}: SearchActivityBlockProps) {
  const activeIndex = SEARCH_ACTIVITY_STAGES.findIndex(
    (stage) => stage.id === stageId,
  );
  const startedLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(startedAt);

  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-[rgba(162,119,79,0.18)] bg-[linear-gradient(145deg,rgba(255,250,242,0.96),rgba(247,239,227,0.84))] shadow-[0_24px_60px_rgba(97,68,38,0.08)]">
      <div className="border-b border-[rgba(162,119,79,0.12)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.72rem] tracking-[0.2em] text-[var(--muted)] uppercase">
              Live retrieval
            </p>
            <h3 className="mt-2 type-display text-[1.38rem] text-[var(--ink)]">
              Building your research run in real time.
            </h3>
          </div>
          <span className="rounded-full border border-[rgba(162,119,79,0.18)] bg-[rgba(255,255,255,0.7)] px-3 py-1.5 text-xs text-[var(--muted)]">
            Started {startedLabel}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:rgba(82,67,56,0.88)]">
          VeriScholar is expanding your question, checking live provider
          coverage, and ranking the strongest sources before the board appears.
        </p>
      </div>

      <div className="grid gap-3 px-5 py-5 md:grid-cols-2">
        {SEARCH_ACTIVITY_STAGES.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id];
          const isActive = stage.id === stageId;
          const isComplete = index < activeIndex;

          return (
            <div
              key={stage.id}
              className={`rounded-[1.3rem] border px-4 py-4 transition-all duration-500 ${
                isActive
                  ? "border-[rgba(162,119,79,0.24)] bg-[rgba(255,255,255,0.92)] shadow-[0_16px_44px_rgba(94,62,26,0.08)]"
                  : isComplete
                    ? "border-[rgba(93,127,99,0.18)] bg-[rgba(244,249,243,0.9)]"
                    : "border-[rgba(118,96,72,0.12)] bg-[rgba(255,255,255,0.58)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-[rgba(162,119,79,0.24)] bg-[rgba(255,245,232,0.92)] text-[var(--accent)]"
                      : isComplete
                        ? "border-[rgba(93,127,99,0.18)] bg-[rgba(236,247,238,0.92)] text-[var(--positive)]"
                        : "border-[rgba(118,96,72,0.14)] bg-[rgba(255,252,245,0.86)] text-[var(--muted)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {stage.label}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.68rem] tracking-[0.14em] uppercase ${
                        isActive
                          ? "bg-[rgba(162,119,79,0.12)] text-[var(--accent)]"
                          : isComplete
                            ? "bg-[rgba(93,127,99,0.12)] text-[var(--positive)]"
                            : "bg-[rgba(118,96,72,0.08)] text-[var(--muted)]"
                      }`}
                    >
                      {isActive
                        ? "In progress"
                        : isComplete
                          ? "Ready"
                          : "Queued"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:rgba(82,67,56,0.82)]">
                    {stage.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
