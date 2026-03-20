import { BookIcon, CopyIcon, GlobeIcon, ShieldIcon } from "@/components/verischolar/icons";
import type { ResearchSource } from "@/lib/verischolar/types";

type ResearchBoardProps = {
  selectedSources: ResearchSource[];
  localRatio: number;
  citationExport: string;
  onToggle: (sourceId: string) => void;
  onCopyCitations: () => void;
  copied: boolean;
};

export function ResearchBoard({
  selectedSources,
  localRatio,
  citationExport,
  onToggle,
  onCopyCitations,
  copied,
}: ResearchBoardProps) {
  return (
    <section className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
            Research board
          </p>
          <h2 className="mt-2 type-display text-[1.45rem] leading-tight text-[var(--ink)]">
            Curate the literature you want to defend.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:rgba(82,67,56,0.84)]">
            Keep your strongest papers pinned here while you test the board.
          </p>
        </div>

        <button
          type="button"
          onClick={onCopyCitations}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.88)] px-4 py-2.5 text-sm text-[var(--ink)]"
        >
          <CopyIcon className="h-4 w-4" />
          {copied ? "Copied APA export" : "Copy APA export"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-[var(--line)] bg-[rgba(255,251,243,0.9)] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
            Local vs foreign balance
          </span>
          <span className="text-sm text-[var(--ink)]">{localRatio}% local</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[rgba(111,91,71,0.08)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--positive),var(--accent))]"
            style={{ width: `${Math.max(localRatio, 8)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {selectedSources.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-[var(--line-strong)] px-5 py-8 text-center text-sm leading-7 text-[var(--muted)]">
            Add at least three sources to start contradiction-aware synthesis.
          </div>
        ) : (
          selectedSources.map((source) => (
            <div
              key={source.id}
              className="rounded-[1.25rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-3.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <h3 className="type-display line-clamp-3 text-[1.08rem] leading-6 text-[var(--ink)]">
                    {source.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[0.76rem] text-[var(--muted)]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5">
                      <BookIcon className="h-4 w-4 text-[var(--accent)]" />
                      {source.journal ?? source.publisher ?? "Venue unknown"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5">
                      <GlobeIcon className="h-4 w-4 text-[var(--accent)]" />
                      {source.localityLabel}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5">
                      <ShieldIcon className="h-4 w-4 text-[var(--accent)]" />
                      {source.credibility.label}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5">
                      {source.sourceProvider}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggle(source.id)}
                  className="shrink-0 rounded-full border border-[var(--line)] px-3 py-2 text-xs tracking-[0.14em] text-[var(--muted)] uppercase"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {citationExport ? (
        <details className="mt-4 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[rgba(43,27,16,0.96)] text-[rgba(251,246,238,0.88)] shadow-[0_22px_60px_rgba(28,17,10,0.24)]">
          <summary className="cursor-pointer list-none px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs tracking-[0.18em] text-[rgba(255,241,221,0.62)] uppercase">
                APA preview
              </span>
              <span className="text-xs text-[rgba(255,241,221,0.72)]">
                Expand
              </span>
            </div>
          </summary>
          <div className="border-t border-[rgba(255,241,221,0.08)] px-4 pb-4 pt-3">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-6">
              {citationExport}
            </pre>
          </div>
        </details>
      ) : null}
    </section>
  );
}
