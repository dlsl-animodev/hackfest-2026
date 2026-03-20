import Link from "next/link";

import { BrandGlyph } from "@/components/verischolar/icons";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between rounded-[1.7rem] border border-[var(--line)] bg-[rgba(255,252,245,0.84)] px-4 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:px-5">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 text-[0.97rem] font-semibold tracking-[0.18em] text-[var(--ink)] uppercase"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,255,255,0.72)] text-[var(--accent)] shadow-[0_10px_26px_rgba(60,35,14,0.08)] transition-transform duration-300 group-hover:-translate-y-0.5">
            <BrandGlyph className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="type-display text-[1rem] tracking-[0.1em] normal-case sm:text-[1.06rem]">
            veriScholar
          </span>
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
