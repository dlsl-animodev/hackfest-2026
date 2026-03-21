import Link from "next/link";

import { TopBar } from "@/components/verischolar/top-bar";
import { listWorkplaceSessions } from "@/lib/verischolar/supabase";

export default async function WorkplaceHubPage() {
  const sessions = await listWorkplaceSessions(24);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ "--topbar-height": "5rem" } as React.CSSProperties}
    >
      <TopBar compact={false} />

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
        <section className="rounded-[1.9rem] border border-[var(--line)] bg-[rgba(255,255,255,0.66)] p-5 shadow-[0_26px_64px_rgba(93,66,37,0.08)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                Workplace
              </p>
              <h1 className="mt-2 type-display text-[1.7rem] leading-tight text-[var(--ink)] sm:text-[1.95rem]">
                Synthesis sessions
              </h1>
              <p className="mt-2 text-[1.02rem] leading-7 text-[color:rgba(82,67,56,0.88)]">
                Resume your contradiction-aware synthesis work from any recent session.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.8)] px-4 py-2.5 text-sm text-[var(--ink)]"
            >
              New search
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="mt-6 rounded-[1.3rem] border border-dashed border-[var(--line-strong)] bg-[rgba(255,251,243,0.72)] p-5 text-sm leading-7 text-[var(--muted)]">
              No workplace sessions yet. Run contradiction-aware synthesis from a research board to create your first session.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sessions.map((session) => (
                <Link
                  key={session.sessionId}
                  href={`/workplace/${encodeURIComponent(session.sessionId)}`}
                  className="rounded-[1.25rem] border border-[var(--line)] bg-[rgba(255,252,245,0.86)] p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
                      {session.analysis.confidenceLabel}
                    </span>
                    <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
                      {session.selectedSourceIds.length} sources
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 type-display text-[1.1rem] leading-6 text-[var(--ink)]">
                    {session.query}
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                    {session.analysis.synthesis}
                  </p>

                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {new Date(session.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
