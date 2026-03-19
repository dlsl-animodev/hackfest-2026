import Link from "next/link";

import { BrandGlyph } from "@/components/verischolar/icons";

const NAV_ITEMS = ["Product", "Approach", "Workflow", "Pitch"];

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.82)] px-5 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 text-[0.97rem] font-semibold tracking-[0.18em] text-[var(--ink)] uppercase"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[rgba(255,255,255,0.72)] text-[var(--accent)] shadow-[0_10px_26px_rgba(60,35,14,0.08)] transition-transform duration-300 group-hover:-translate-y-0.5">
            <BrandGlyph className="h-5 w-5" />
          </span>
          <span className="type-display text-[1.08rem] tracking-[0.14em] normal-case">
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
