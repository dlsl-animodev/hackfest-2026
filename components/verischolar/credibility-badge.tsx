import type { CredibilitySummary } from "@/lib/verischolar/types";

const LABEL_STYLES: Record<string, string> = {
  Trusted:
    "border-[rgba(91,123,92,0.25)] bg-[rgba(116,146,109,0.12)] text-[var(--positive)]",
  Review:
    "border-[rgba(182,131,67,0.25)] bg-[rgba(191,150,88,0.12)] text-[var(--warning)]",
  Risk: "border-[rgba(122,45,45,0.2)] bg-[rgba(153,63,63,0.1)] text-[var(--danger)]",
};

type CredibilityBadgeProps = {
  credibility: CredibilitySummary;
};

export function CredibilityBadge({ credibility }: CredibilityBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.12em] uppercase ${LABEL_STYLES[credibility.label]}`}
      title={credibility.explanations.join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {credibility.label}
      <span className="text-[0.7rem] opacity-70">{credibility.score}</span>
    </div>
  );
}
