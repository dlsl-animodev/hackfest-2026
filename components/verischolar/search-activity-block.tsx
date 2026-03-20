import {
  BrainCircuit,
  DatabaseZap,
  LayoutPanelTop,
  ShieldCheck,
} from "lucide-react";
import { m, useReducedMotion } from "framer-motion";

import {
  CHAT_MOTION,
  getFadeUpVariants,
  getStaggerContainerVariants,
} from "@/lib/verischolar/motion";
import {
  SEARCH_ACTIVITY_STAGES,
  type SearchActivityStageId,
} from "@/lib/verischolar/search-session";

type SearchActivityBlockProps = {
  stageId: SearchActivityStageId;
  startedAt: number;
};

const STAGE_ICONS = {
  "understanding-query": BrainCircuit,
  "searching-providers": DatabaseZap,
  "checking-credibility": ShieldCheck,
  "preparing-board": LayoutPanelTop,
} satisfies Record<SearchActivityStageId, typeof BrainCircuit>;

export function SearchActivityBlock({
  stageId,
  startedAt,
}: SearchActivityBlockProps) {
  const reduceMotion = useReducedMotion();
  const activeIndex = SEARCH_ACTIVITY_STAGES.findIndex(
    (stage) => stage.id === stageId,
  );
  const startedLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(startedAt);
  const progress = ((Math.max(activeIndex, 0) + 1) / SEARCH_ACTIVITY_STAGES.length) * 100;
  const containerVariants = getStaggerContainerVariants(
    Boolean(reduceMotion),
    0.06,
  );
  const fadeUpVariants = getFadeUpVariants(Boolean(reduceMotion));

  return (
    <m.div
      className="relative overflow-hidden rounded-[1.7rem] border border-[rgba(162,119,79,0.18)] bg-[linear-gradient(145deg,rgba(255,250,242,0.96),rgba(247,239,227,0.84))] shadow-[0_24px_60px_rgba(97,68,38,0.08)] min-h-[28rem] md:min-h-[22rem]"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      transition={{ layout: CHAT_MOTION.layout }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(186,145,90,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(114,137,96,0.1),transparent_30%)]" />

      <m.div
        className="relative border-b border-[rgba(162,119,79,0.12)] px-5 py-4"
        variants={fadeUpVariants}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.72rem] tracking-[0.2em] text-[var(--muted)] uppercase">
              Live retrieval
            </p>
            <h3 className="mt-2 type-display text-[1.38rem] text-[var(--ink)]">
              Building your research run in real time.
            </h3>
          </div>
          <span className="rounded-full border border-[rgba(162,119,79,0.18)] bg-[rgba(255,255,255,0.7)] px-3 py-1.5 text-xs text-[var(--muted)]">
            Started {startedLabel}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:rgba(82,67,56,0.88)]">
          VeriScholar is expanding your question, checking live provider
          coverage, and ranking the strongest sources before the board appears.
        </p>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgba(111,91,71,0.08)]">
          <m.div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(93,127,99,0.92),rgba(162,119,79,0.96),rgba(205,165,107,0.94))] shadow-[0_0_20px_rgba(162,119,79,0.22)]"
            initial={false}
            animate={{ width: `${Math.max(progress, 14)}%` }}
            transition={{
              duration: reduceMotion
                ? CHAT_MOTION.durations.brisk
                : CHAT_MOTION.durations.base,
              ease: CHAT_MOTION.ease,
            }}
          />
        </div>
      </m.div>

      <m.div
        className="relative grid gap-3 px-5 py-5 md:grid-cols-2"
        variants={fadeUpVariants}
      >
        {SEARCH_ACTIVITY_STAGES.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id];
          const isActive = stage.id === stageId;
          const isComplete = index < activeIndex;

          return (
            <m.div
              key={stage.id}
              variants={fadeUpVariants}
              layout
              transition={{ layout: CHAT_MOTION.layout }}
              className={`relative min-h-[9rem] overflow-hidden rounded-[1.3rem] border px-4 py-4 transition-all duration-500 ${
                isActive
                  ? "border-[rgba(162,119,79,0.24)] bg-[rgba(255,255,255,0.92)] shadow-[0_16px_44px_rgba(94,62,26,0.08)]"
                  : isComplete
                    ? "border-[rgba(93,127,99,0.18)] bg-[rgba(244,249,243,0.9)]"
                    : "border-[rgba(118,96,72,0.12)] bg-[rgba(255,255,255,0.58)]"
              }`}
            >
              {isActive && !reduceMotion ? (
                <m.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.88),transparent)] mix-blend-screen"
                  animate={{ x: ["-12%", "250%"] }}
                  transition={{
                    duration: 1.7,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 0.18,
                  }}
                />
              ) : null}

              <div className="relative flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-500 ${
                    isActive
                      ? "border-[rgba(162,119,79,0.24)] bg-[rgba(255,245,232,0.92)] text-[var(--accent)]"
                      : isComplete
                        ? "border-[rgba(93,127,99,0.18)] bg-[rgba(236,247,238,0.92)] text-[var(--positive)]"
                        : "border-[rgba(118,96,72,0.14)] bg-[rgba(255,252,245,0.86)] text-[var(--muted)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {stage.label}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.68rem] tracking-[0.14em] uppercase transition-colors duration-500 ${
                        isActive
                          ? "bg-[rgba(162,119,79,0.12)] text-[var(--accent)]"
                          : isComplete
                            ? "bg-[rgba(93,127,99,0.12)] text-[var(--positive)]"
                            : "bg-[rgba(118,96,72,0.08)] text-[var(--muted)]"
                      }`}
                    >
                      {isActive
                        ? "In progress"
                        : isComplete
                          ? "Ready"
                          : "Queued"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:rgba(82,67,56,0.82)]">
                    {stage.detail}
                  </p>
                </div>
              </div>
            </m.div>
          );
        })}
      </m.div>
    </m.div>
  );
}
