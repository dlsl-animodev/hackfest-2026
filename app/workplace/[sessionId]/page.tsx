import Link from "next/link";
import { notFound } from "next/navigation";

import { TopBar } from "@/components/verischolar/top-bar";
import { WorkplaceValidationSection } from "@/components/verischolar/workplace-validation-section";
import { readWorkplaceSession } from "@/lib/verischolar/supabase";

type WorkplaceSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function WorkplaceSessionPage({
  params,
}: WorkplaceSessionPageProps) {
  const { sessionId } = await params;
  const session = await readWorkplaceSession(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ "--topbar-height": "5rem" } as React.CSSProperties}
    >
      <TopBar compact={false} />

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
        <section className="rounded-[1.9rem] border border-[var(--line)] bg-[rgba(255,255,255,0.66)] p-5 shadow-[0_26px_64px_rgba(93,66,37,0.08)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                Workplace session
              </p>
              <h1 className="mt-2 type-display text-[1.65rem] leading-tight text-[var(--ink)] sm:text-[1.9rem]">
                Contradiction-aware synthesis
              </h1>
              <p className="mt-2 max-w-[65ch] text-[1.02rem] leading-7 text-[color:rgba(82,67,56,0.88)]">
                {session.query}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
                {session.analysis.confidenceLabel}
              </span>
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-3 py-1.5 text-xs text-[var(--muted)]">
                {session.analysis.model}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,251,243,0.9)] p-4">
            <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
              Full synthesis
            </p>
            <p className="mt-3 text-[1.04rem] leading-7 text-[color:rgba(61,47,34,0.94)]">
              {session.analysis.synthesis}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Generated{" "}
              {new Date(session.analysis.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  Contradictions
                </p>
                <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
                  {session.analysis.conflicts.length} claims
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {session.analysis.conflicts.length > 0 ? (
                  session.analysis.conflicts.map((conflict) => (
                    <div
                      key={conflict.claim}
                      className="rounded-[1.1rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] p-3"
                    >
                      <p className="text-sm leading-7 text-[var(--ink)]">
                        {conflict.claim}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Supporting:{" "}
                        {conflict.supportingSourceIds.join(", ") || "None"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Opposing:{" "}
                        {conflict.opposingSourceIds.join(", ") || "None"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    No sharp contradictions were detected in this run.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-4">
                <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  Research gaps
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:rgba(61,47,34,0.92)]">
                  {session.analysis.researchGaps.map((gap) => (
                    <li key={gap}>- {gap}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-4">
                <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  Confidence notes
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:rgba(61,47,34,0.92)]">
                  {session.analysis.confidenceNotes.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <WorkplaceValidationSection analysis={session.analysis} />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.9)] px-4 py-3">
              <p className="text-sm text-[var(--muted)]">
                Session {session.sessionId} • {session.selectedSourceIds.length}{" "}
                sources
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/?q=${encodeURIComponent(session.query)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.8)] px-4 py-2.5 text-sm text-[var(--ink)]"
                >
                  Back to search board
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
