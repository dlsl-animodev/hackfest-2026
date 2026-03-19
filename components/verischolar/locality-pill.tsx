import type { LocalityLabel } from "@/lib/verischolar/types";

type LocalityPillProps = {
  localityLabel: LocalityLabel;
  reason: string;
};

const LABEL_STYLES: Record<LocalityLabel, string> = {
  Local:
    "border-[rgba(93,132,99,0.24)] bg-[rgba(120,150,110,0.1)] text-[var(--positive)]",
  Foreign: "border-[var(--line)] bg-[rgba(255,252,245,0.68)] text-[var(--muted)]",
  Unknown:
    "border-[rgba(182,131,67,0.25)] bg-[rgba(191,150,88,0.12)] text-[var(--warning)]",
};

export function LocalityPill({ localityLabel, reason }: LocalityPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs tracking-[0.14em] uppercase ${LABEL_STYLES[localityLabel]}`}
      title={reason}
    >
      {localityLabel}
    </span>
  );
}
