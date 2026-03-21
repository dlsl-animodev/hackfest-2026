"use client";

import ValidateGapBoard from "@/components/validate-gap/validate-gap-board";
import type { AnalysisResult } from "@/lib/verischolar/types";

type WorkplaceValidationSectionProps = {
  analysis: AnalysisResult;
};

export function WorkplaceValidationSection({
  analysis,
}: WorkplaceValidationSectionProps) {
  return (
    <section className="rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,252,245,0.9)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
            Gap validation
          </p>
          <p className="mt-2 text-base text-[var(--muted)]">
            Validate unresolved gaps without leaving this session.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ValidateGapBoard embedded initialAnalysis={analysis} />
      </div>
    </section>
  );
}
