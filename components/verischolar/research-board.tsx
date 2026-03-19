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
    <section className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
            Research board
          </p>
          <h2 className="mt-3 type-display text-[1.8rem] leading-tight text-[var(--ink)]">
            Curate the literature you want to defend.
          </h2>
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

      <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,251,243,0.9)] p-4">
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

      <div className="mt-5 space-y-3">
        {selectedSources.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-[var(--line-strong)] px-5 py-8 text-center text-sm leading-7 text-[var(--muted)]">
            Add at least three sources to start contradiction-aware synthesis.
          </div>
        ) : (
          selectedSources.map((source) => (
            <div
              key={source.id}
              className="rounded-[1.4rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="type-display text-[1.2rem] leading-7 text-[var(--ink)]">
                    {source.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
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
                  className="rounded-full border border-[var(--line)] px-3 py-2 text-xs tracking-[0.14em] text-[var(--muted)] uppercase"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {citationExport ? (
        <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(43,27,16,0.96)] p-4 text-[rgba(251,246,238,0.88)] shadow-[0_22px_60px_rgba(28,17,10,0.24)]">
          <p className="text-xs tracking-[0.18em] text-[rgba(255,241,221,0.62)] uppercase">
            APA preview
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6">
            {citationExport}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
