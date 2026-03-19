"use client";

import { useState } from "react";

import { ArrowUpIcon } from "@/components/verischolar/icons";
import { SuggestionChips } from "@/components/verischolar/suggestion-chips";

type PromptComposerProps = {
  initialQuery?: string;
  compact?: boolean;
};

export function PromptComposer({
  initialQuery = "",
  compact = false,
}: PromptComposerProps) {
  const [expanded, setExpanded] = useState(!compact);

  if (compact && !expanded) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.9)] px-5 text-sm font-medium text-[var(--ink)] shadow-[var(--shadow-soft)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          Search
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-0" : "space-y-8"}>
      <form
        action="/"
        method="get"
        className={`composer-shell relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] ${
          compact ? "px-4 py-3 sm:px-5" : "px-4 py-4 sm:px-6 sm:py-5"
        } shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-500`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(189,145,86,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(114,137,96,0.09),transparent_30%)]" />
        <div className="relative space-y-4">
          <textarea
            name="q"
            rows={compact ? 1 : 4}
            defaultValue={initialQuery}
            placeholder="Describe your research problem, target population, or what needs verification."
            className={`w-full resize-none border-none bg-transparent pr-12 text-[1rem] text-[var(--ink)] outline-none placeholder:text-[color:rgba(94,82,69,0.5)] sm:text-[1.08rem] ${
              compact ? "leading-7" : "leading-8"
            }`}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              {compact ? (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-full border border-[var(--line)] px-3 py-1 text-xs"
                >
                  Hide
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-[0_16px_40px_rgba(32,20,12,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
              aria-label="Search research sources"
            >
              <ArrowUpIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>

      {!compact ? <SuggestionChips compact={compact} /> : null}
    </div>
  );
}
