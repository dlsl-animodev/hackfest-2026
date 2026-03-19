import type { DashboardMetrics } from "@/lib/verischolar/types";

const metricCards = (metrics: DashboardMetrics) => [
  { label: "Selected", value: metrics.sourceCount, tone: "var(--ink)" },
  { label: "Local ratio", value: `${metrics.ratioLocal}%`, tone: "var(--positive)" },
  { label: "Risk sources", value: metrics.flaggedCount, tone: "var(--danger)" },
  {
    label: "Metadata gaps",
    value: metrics.unknownMetadataCount,
    tone: "var(--warning)",
  },
];

type CitationHealthRailProps = {
  metrics: DashboardMetrics;
};

export function CitationHealthRail({ metrics }: CitationHealthRailProps) {
  return (
    <section className="rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,255,255,0.68)] p-4 shadow-[0_18px_48px_rgba(94,68,44,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
            Citation health
          </p>
          <h3 className="mt-2 type-display text-[1.2rem] text-[var(--ink)]">
            Board diagnostics
          </h3>
        </div>
        <div className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
          Trusted {metrics.trustedCount}/{metrics.sourceCount}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {metricCards(metrics).map((metric) => (
          <div
            key={metric.label}
            className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-4 py-3"
          >
            <p className="text-xs tracking-[0.15em] text-[var(--muted)] uppercase">
              {metric.label}
            </p>
            <p
              className="mt-2 type-display text-[1.35rem]"
              style={{ color: metric.tone }}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        {metrics.retractedCount} retracted, {metrics.predatoryCount} predatory-risk,{" "}
        {metrics.oldSourceCount} older than 10 years.
      </div>
    </section>
  );
}
