import { ArrowUpRightIcon, PinIcon, ShieldIcon } from "@/components/verischolar/icons";
import { CredibilityBadge } from "@/components/verischolar/credibility-badge";
import { LocalityPill } from "@/components/verischolar/locality-pill";
import type { ResearchSource } from "@/lib/verischolar/types";

type ResultCardProps = {
  source: ResearchSource;
  selected: boolean;
  onToggle: (sourceId: string) => void;
};

export function ResultCard({ source, selected, onToggle }: ResultCardProps) {
  const venueLine = [source.journal, source.publisher].filter(Boolean).join(" | ");

  return (
    <article
      className={`rounded-[1.6rem] border p-5 transition-all duration-300 ${
        selected
          ? "border-[var(--line-strong)] bg-[rgba(255,251,243,0.95)] shadow-[0_24px_64px_rgba(94,62,26,0.12)]"
          : "border-[var(--line)] bg-[rgba(255,255,255,0.72)] hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CredibilityBadge credibility={source.credibility} />
          <LocalityPill
            localityLabel={source.localityLabel}
            reason={source.localReason}
          />
        </div>
        <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
          {source.year ?? "Year unknown"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <h3 className="type-display text-[1.38rem] leading-8 text-[var(--ink)]">
          {source.title}
        </h3>
        <p className="text-sm leading-7 text-[var(--muted)]">
          {source.authors.join(", ") || "Unknown author"}
        </p>
        <p className="text-sm leading-7 text-[var(--muted)]">
          {venueLine || "Venue metadata incomplete"}
        </p>
        {source.summary ? (
          <div className="rounded-[1.1rem] border border-[var(--line)] bg-[rgba(255,252,245,0.72)] p-3">
            <p className="text-[0.72rem] tracking-[0.16em] text-[var(--muted)] uppercase">
              Summary
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:rgba(53,41,32,0.92)]">
              {source.summary}
            </p>
          </div>
        ) : (
          <p className="line-clamp-4 text-sm leading-7 text-[color:rgba(71,58,47,0.88)]">
            {source.abstract ?? "Abstract unavailable from live metadata."}
          </p>
        )}

        {source.keyFinding ? (
          <div className="rounded-[1.1rem] border border-[rgba(182,131,67,0.28)] bg-[rgba(255,245,229,0.72)] p-3">
            <p className="text-[0.72rem] tracking-[0.16em] text-[color:rgba(117,76,36,0.9)] uppercase">
              Key finding
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:rgba(62,45,31,0.95)]">
              {source.keyFinding}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2">
          <ShieldIcon className="h-4 w-4 text-[var(--accent)]" />
          {source.credibility.explanations[0]}
        </span>
        <span className="rounded-full border border-[var(--line)] px-3 py-2">
          {source.citationCount !== null
            ? `${source.citationCount} citations`
            : "Citation count unknown"}
        </span>
        <span className="rounded-full border border-[var(--line)] px-3 py-2">
          {source.sourceProvider}
        </span>
        {source.retractionStatus === "Retracted" ? (
          <span className="rounded-full border border-[rgba(122,45,45,0.2)] bg-[rgba(153,63,63,0.1)] px-3 py-2 text-[var(--danger)]">
            Retracted
          </span>
        ) : null}
        {source.predatoryStatus === "Predatory" ? (
          <span className="rounded-full border border-[rgba(122,45,45,0.2)] bg-[rgba(153,63,63,0.1)] px-3 py-2 text-[var(--danger)]">
            Predatory risk
          </span>
        ) : null}
        {source.missingFields.length > 0 ? (
          <span className="rounded-full border border-[rgba(182,131,67,0.25)] bg-[rgba(191,150,88,0.12)] px-3 py-2 text-[var(--warning)]">
            Missing {source.missingFields.join(", ")}
          </span>
        ) : null}
      </div>

      {source.credibility.methodologyNote ? (
        <div className="mt-4 rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.82)] p-3 text-sm leading-6 text-[color:rgba(68,54,42,0.9)]">
          <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
            Abstract-based methodology note
          </p>
          <p className="mt-2">{source.credibility.methodologyNote}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onToggle(source.id)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-all duration-300 ${
            selected
              ? "bg-[var(--ink)] text-[var(--bg)] shadow-[0_18px_40px_rgba(37,23,12,0.14)]"
              : "border border-[var(--line)] bg-[rgba(255,252,245,0.86)] text-[var(--ink)]"
          }`}
        >
          <PinIcon className="h-4 w-4" />
          {selected ? "Pinned to board" : "Add to board"}
        </button>

        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors duration-200 hover:text-[var(--ink)]"
          >
            Open source
            <ArrowUpRightIcon className="h-4 w-4" />
          </a>
        ) : (
          <span className="text-sm text-[var(--muted)]">Source URL unavailable</span>
        )}
      </div>
    </article>
  );
}
