import { CitationHealthRail } from "@/components/verischolar/citation-health-rail";
import { SparkIcon } from "@/components/verischolar/icons";
import type { AnalysisActionState } from "@/lib/verischolar/action-state";
import type { DashboardMetrics } from "@/lib/verischolar/types";

type AnalysisPanelProps = {
  query: string;
  selectedSourceIds: string[];
  action: (payload: FormData) => void;
  actionState: AnalysisActionState;
  isPending: boolean;
  isStale: boolean;
  metrics: DashboardMetrics;
};

export function AnalysisPanel({
  query,
  selectedSourceIds,
  action,
  actionState,
  isPending,
  isStale,
  metrics,
}: AnalysisPanelProps) {
  return (
    <section className="space-y-4">
      <CitationHealthRail metrics={metrics} />

      <div className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
              Synthesis studio
            </p>
            <h2 className="mt-3 type-display text-[1.72rem] leading-tight text-[var(--ink)]">
              Verify the narrative before it becomes your RRL.
            </h2>
          </div>
          {isStale ? (
            <span className="rounded-full border border-[rgba(182,131,67,0.22)] bg-[rgba(191,150,88,0.1)] px-3 py-1.5 text-xs text-[var(--warning)]">
              Board changed
            </span>
          ) : null}
        </div>

        <form action={action} className="mt-5">
          <input type="hidden" name="query" value={query} />
          {selectedSourceIds.map((sourceId) => (
            <input key={sourceId} type="hidden" name="sourceId" value={sourceId} />
          ))}

          <button
            type="submit"
            disabled={selectedSourceIds.length < 3 || isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-3 text-sm text-[var(--bg)] shadow-[0_18px_44px_rgba(33,21,13,0.16)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparkIcon className="h-4 w-4" />
            {isPending ? "Synthesizing board..." : "Run contradiction-aware synthesis"}
          </button>
        </form>

        {actionState.message ? (
          <p
            className={`mt-4 text-sm ${
              actionState.status === "error"
                ? "text-[var(--danger)]"
                : "text-[var(--muted)]"
            }`}
          >
            {actionState.message}
          </p>
        ) : null}

        {actionState.analysis ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,251,243,0.86)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  Synthesis
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
                    {actionState.analysis.confidenceLabel}
                  </span>
                  <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
                    {actionState.analysis.model}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-[color:rgba(61,47,34,0.92)]">
                {actionState.analysis.synthesis}
              </p>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Generated {new Date(actionState.analysis.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.68)] p-4">
              <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                Conflicts
              </p>
              <div className="mt-3 space-y-3">
                {actionState.analysis.conflicts.length > 0 ? (
                  actionState.analysis.conflicts.map((conflict) => (
                    <div
                      key={conflict.claim}
                      className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.86)] p-3"
                    >
                      <p className="text-sm leading-7 text-[var(--ink)]">{conflict.claim}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Supporting: {conflict.supportingSourceIds.join(", ") || "None"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Opposing: {conflict.opposingSourceIds.join(", ") || "None"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    No sharp contradictions were detected yet. Add more varied sources to stress-test the claim landscape.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.68)] p-4">
                <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  Research gaps
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:rgba(61,47,34,0.92)]">
                  {actionState.analysis.researchGaps.map((gap) => (
                    <li key={gap}>- {gap}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.68)] p-4">
                <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  Confidence notes
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:rgba(61,47,34,0.92)]">
                  {actionState.analysis.confidenceNotes.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--line-strong)] bg-[rgba(255,251,243,0.68)] p-5 text-sm leading-7 text-[var(--muted)]">
            Select three or more sources and run synthesis to generate a board-level summary, conflict map, and research gap check.
          </div>
        )}
      </div>
    </section>
  );
}
