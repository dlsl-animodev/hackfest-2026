"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BrandGlyph } from "@/components/verischolar/icons";
import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";
import { useResearchBoardStore } from "@/store/useResearchBoardStore";
import { useSearchSessionStore } from "@/store/useSearchSessionStore";

type TopBarProps = {
  compact?: boolean;
};

export function TopBar({ compact = false }: TopBarProps) {
  const router = useRouter();
  const pendingSearch = useSearchSessionStore((state) => state.pendingSearch);
  const resetSession = useSearchSessionStore((state) => state.resetSession);
  const resetBoard = useResearchBoardStore((state) => state.resetBoard);
  const clearAnalysisState = useAnalysisStateStore(
    (state) => state.clearAnalysisState,
  );
  const isCompact = compact || Boolean(pendingSearch);

  function handleGoHome() {
    resetSession();
    resetBoard();
    clearAnalysisState();
    router.push("/");
  }

  return (
    <header
      className={`sticky top-0 z-30 px-4 sm:px-6 lg:px-10 ${
        isCompact ? "pt-2" : "pt-3"
      }`}
    >
      <div
        className={`flex items-center rounded-[1.7rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] shadow-[var(--shadow-soft)] backdrop-blur-xl ${
          isCompact
            ? "mx-auto w-full max-w-[1120px] justify-between px-2.5 py-1.5 sm:px-3"
            : "mx-auto max-w-[1120px] justify-between px-4 py-2.5 sm:px-5"
        }`}
      >
        <Link
          href="/"
          onClick={handleGoHome}
          className={`group inline-flex items-center text-[var(--ink)] uppercase ${
            isCompact
              ? "gap-0"
              : "gap-3 text-[0.97rem] font-semibold tracking-[0.18em]"
          }`}
        >
          <span
            className={`flex items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,255,255,0.72)] text-[var(--accent)] shadow-[0_10px_26px_rgba(60,35,14,0.08)] transition-transform duration-300 group-hover:-translate-y-0.5 ${
              isCompact ? "h-8 w-8" : "h-9 w-9"
            }`}
          >
            <BrandGlyph
              className={isCompact ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]"}
            />
          </span>
          {isCompact ? null : (
            <span className="type-display text-[1rem] tracking-[0.1em] normal-case sm:text-[1.06rem]">
              veriScholar
            </span>
          )}
        </Link>

        <Link
          href="/workplace"
          className={`inline-flex items-center rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] text-[var(--ink)] transition-colors duration-200 hover:bg-[rgba(255,255,255,0.94)] ${
            isCompact
              ? "px-3 py-1.5 text-xs tracking-[0.12em] uppercase"
              : "px-4 py-2 text-sm"
          }`}
        >
          Workplace
        </Link>

        {/* <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item}
              href={item === "Product" ? "/" : `/#${item.toLowerCase()}`}
              className="transition-colors duration-200 hover:text-[var(--ink)]"
            >
              {item}
            </Link>
          ))}
        </nav> */}
      </div>
    </header>
  );
}
