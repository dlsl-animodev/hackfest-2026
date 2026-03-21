"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { ArrowUpIcon } from "@/components/verischolar/icons";
import { SuggestionChips } from "@/components/verischolar/suggestion-chips";

type PromptComposerProps = {
  initialQuery?: string;
  compact?: boolean;
  isPending?: boolean;
  onSubmitQuery?: (query: string) => void;
};

export function PromptComposer({
  initialQuery = "",
  compact = false,
  isPending = false,
  onSubmitQuery,
}: PromptComposerProps) {
  const [query, setQuery] = useState(initialQuery);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    if (!onSubmitQuery) {
      return;
    }

    onSubmitQuery(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isPending) {
      return;
    }

    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <div className={compact ? "space-y-0" : "space-y-4"}>
      <form
        ref={formRef}
        action={onSubmitQuery ? undefined : "/"}
        method={onSubmitQuery ? undefined : "get"}
        onSubmit={handleSubmit}
        className={`composer-shell relative overflow-hidden rounded-[1rem] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] ${
          compact ? "px-4 py-3 sm:px-5" : "px-4 py-3 sm:px-5 sm:py-3.5"
        } shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-500`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(189,145,86,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(114,137,96,0.09),transparent_30%)]" />
        <div className="relative space-y-3.5">
          <textarea
            name="q"
            rows={1}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            enterKeyHint="search"
            placeholder="Describe your research problem, target population, or what needs verification."
            className={`w-full resize-none border-none bg-transparent pr-12 text-[1.02rem] text-[var(--ink)] outline-none placeholder:text-[color:rgba(94,82,69,0.5)] sm:text-[1.06rem] ${
              compact
                ? "max-h-24 min-h-[2.85rem] leading-6"
                : "max-h-24 min-h-[3.05rem] leading-6"
            }`}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.74)] px-3 py-1.5 text-[0.76rem] tracking-[0.14em] uppercase">
                {compact ? "Continue the thread" : "Ask a research question"}
              </span>
              {isPending ? (
                <span className="rounded-full border border-[rgba(162,119,79,0.2)] bg-[rgba(255,245,232,0.82)] px-3 py-1.5 text-[0.78rem] text-[var(--accent)]">
                  Search in progress
                </span>
              ) : (
                <span className="text-[0.8rem] text-[color:rgba(120,102,85,0.84)]">
                  Enter to send, Shift+Enter for newline
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!query.trim() || isPending}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-[0_14px_34px_rgba(32,20,12,0.16)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={
                isPending
                  ? "Research search is in progress"
                  : "Search research sources"
              }
            >
              <ArrowUpIcon
                className={`h-5 w-5 transition-transform duration-300 ${
                  isPending ? "animate-pulse" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </form>

      {!compact ? (
        <SuggestionChips compact={compact} onSelectSuggestion={onSubmitQuery} />
      ) : null}
    </div>
  );
}
