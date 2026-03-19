const SUGGESTIONS = [
  "Find local sources on social media and mental health",
  "Detect conflicting claims in AI-assisted learning research",
  "Build APA-ready citations for a Philippine literature review",
  "Check credibility risks in disaster preparedness sources",
];

type SuggestionChipsProps = {
  compact?: boolean;
};

export function SuggestionChips({ compact = false }: SuggestionChipsProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-3 ${
        compact ? "justify-start" : ""
      }`}
    >
      {SUGGESTIONS.map((suggestion) => (
        <form key={suggestion} action="/" method="get">
          <button
            type="submit"
            name="q"
            value={suggestion}
            className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.62)] px-4 py-2.5 text-sm text-[var(--muted)] shadow-[0_18px_40px_rgba(119,93,64,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
          >
            {suggestion}
          </button>
        </form>
      ))}
    </div>
  );
}
