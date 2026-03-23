import React, { useState } from "react";
import {
  ArrowUpRightIcon,
  PinIcon,
  ShieldIcon,
} from "@/components/verischolar/icons";
import { CredibilityBadge } from "@/components/verischolar/credibility-badge";
import { LocalityPill } from "@/components/verischolar/locality-pill";
import type { ResearchSource } from "@/lib/verischolar/types";
import { UsersRound, Newspaper, ChevronDown } from 'lucide-react';

type ResultCardProps = {
  source: ResearchSource;
  selected: boolean;
  onToggle: (sourceId: string) => void;
};

export function ResultCard({ source, selected, onToggle }: ResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const venueLine = [source.journal, source.publisher]
    .filter(Boolean)
    .join(" | ");

  return (
    <article
      className={`rounded-[1.45rem] border p-4 transition-all duration-300 sm:p-5 ${
        selected
          ? "border-[var(--line-strong)] bg-[rgba(255,251,243,0.95)] shadow-[0_22px_54px_rgba(94,62,26,0.1)]"
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
        <h3 className="type-display line-clamp-3 text-[1.22rem] leading-[1.28] text-[var(--ink)] sm:text-[1.3rem]">
          {source.title}
        </h3>
        {/*Authors*/}
        <div className="flex flex-row items-start gap-3">
          <UsersRound className="w-4 h-4 text-[var(--muted)] mt-1 shrink-0"/>
          <p className="line-clamp-2 text-[1.03rem] leading-6 text-[var(--muted)]">
            {source.authors.join(", ") || "Unknown author"}
          </p>
        </div>
        
        {/*VenueLine*/}
        <div className="flex flex-row items-start gap-3">
          <Newspaper className="w-4 h-4 text-[var(--muted)] mt-1 shrink-0"/>
          <p className="line-clamp-2 text-[1.02rem] leading-6 text-[var(--muted)]">
            {venueLine || "Venue metadata incomplete"}
          </p>
        </div>
        
      
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.86rem] text-[var(--muted)]">
          <span className="rounded-full border border-[var(--line)] px-3 py-2">
            {source.citationCount !== null
              ? `${source.citationCount} citations`
              : "Citation count unknown"}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-2">
            {source.sourceProvider}
          </span>
          {source.journalTier ? (
            <span className="rounded-full border border-[var(--line)] px-3 py-2">
              {source.journalTier}
            </span>
          ) : null}
          {source.retractionStatus === "Retracted" ? (
            <span className="rounded-full border border-[rgba(122,45,45,0.2)] bg-[rgba(153,63,63,0.1)] px-3 py-2 text-[var(--danger)]">
              Retracted
            </span>
          ) : null}
          {source.predatoryStatus === "Predatory" ? (
            <span className="rounded-full border border-[var(--danger)] bg-[rgba(153,63,63,0.1)] px-3 py-2 text-[var(--danger)]">
              Predatory risk
            </span>
          ) : null}
          {source.missingFields.length > 0 ? (
            <span className="rounded-full border border-[var(--warning)] bg-[rgba(191,150,88,0.12)] px-3 py-2 text-[var(--warning)]">
              Missing {source.missingFields.join(", ")}
            </span>
          ) : null}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 py-1 text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-all"
        >
          {isExpanded ? "Hide summary" : "View summary & details"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

      </div>
  
      {isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            
          <div className="grid gap-3">
            {source.summary ? (
              <div className="rounded-[1.05rem] border border-[var(--line)] bg-[rgba(255,252,245,0.72)] p-3">
                <p className="text-[0.76rem] tracking-[0.16em] text-[var(--muted)] uppercase">
                  Summary
                </p>
                <p className="mt-2 line-clamp-4 text-[1.02rem] leading-6 text-[color:rgba(53,41,32,0.92)]">
                  {source.summary}
                </p>
              </div>
            ) : (
              <p className="line-clamp-4 text-[1.02rem] leading-6 text-[color:rgba(71,58,47,0.88)]">
                {source.abstract ?? "Abstract unavailable from live metadata."}
              </p>
            )}

            {source.keyFinding ? (
              <div className="rounded-[1.05rem] border border-[rgba(182,131,67,0.28)] bg-[rgba(255,245,229,0.72)] p-3">
                <p className="text-[0.76rem] tracking-[0.16em] text-[color:rgba(117,76,36,0.9)] uppercase">
                  Key finding
                </p>
                <p className="mt-2 line-clamp-4 text-[1.02rem] leading-6 text-[color:rgba(62,45,31,0.95)]">
                  {source.keyFinding}
                </p>
              </div>
            ) : null}
          </div>
        

        <div className="mt-4 rounded-[1.05rem] border border-[var(--line)] bg-[rgba(255,252,245,0.74)] p-3">
          <p className="text-[0.76rem] tracking-[0.16em] text-[var(--muted)] uppercase">
            Credibility signal
          </p>
          <p className="mt-2 line-clamp-2 text-[1.02rem] leading-6 text-[color:rgba(68,54,42,0.9)]">
            <ShieldIcon className="mr-2 inline h-4 w-4 text-[var(--accent)]" />
            {source.credibility.explanations[0]}
          </p>
        </div>

        {source.credibility.methodologyNote ? (
          <div className="mt-4 rounded-[1.05rem] border border-[var(--line)] bg-[rgba(255,252,245,0.82)] p-3 text-[1.02rem] leading-6 text-[color:rgba(68,54,42,0.9)]">
            <p className="text-[0.76rem] tracking-[0.14em] text-[var(--muted)] uppercase">
              Methodology note
            </p>
            <p className="mt-2 line-clamp-3">
              {source.credibility.methodologyNote}
            </p>
          </div>
        ) : null}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onToggle(source.id)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-all duration-300 ${
            selected
              ? "bg-[var(--ink)] text-[var(--bg)]"
              : "border border-[var(--line)] bg-[rgba(255,252,245,0.86)] text-[var(--ink)] hover:bg-[var(--accent2)]"
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
          <span className="text-sm text-[var(--muted)]">
            Source URL unavailable
          </span>
        )}
      </div>
    </article>
  );
}
