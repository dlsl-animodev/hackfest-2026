const SUGGESTIONS = [
  "Find local sources on social media and mental health",
  "Detect conflicting claims in AI-assisted learning research",
  "Build APA-ready citations for a Philippine literature review",
  "Check credibility risks in disaster preparedness sources",
];

type SuggestionChipsProps = {
  compact?: boolean;
  onSelectSuggestion?: (query: string) => void;
};

export function SuggestionChips({
  compact = false,
  onSelectSuggestion,
}: SuggestionChipsProps) {
  return (
    <div
      className={`grid gap-2.5 ${
        compact
          ? "grid-cols-1 justify-start"
          : "mx-auto w-full max-w-[900px] sm:grid-cols-2"
      }`}
    >
      {SUGGESTIONS.map((suggestion) => (
        <form
          key={suggestion}
          action={onSelectSuggestion ? undefined : "/"}
          method={onSelectSuggestion ? undefined : "get"}
          onSubmit={(event) => {
            if (!onSelectSuggestion) {
              return;
            }

            event.preventDefault();
            onSelectSuggestion(suggestion);
          }}
        >
          <button
            type="submit"
            name={onSelectSuggestion ? undefined : "q"}
            value={suggestion}
            className="w-full rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.62)] px-4 py-2 text-[0.9rem] leading-6 text-[var(--muted)] shadow-[0_16px_34px_rgba(119,93,64,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
          >
            {suggestion}
          </button>
        </form>
      ))}
    </div>
  );
}
