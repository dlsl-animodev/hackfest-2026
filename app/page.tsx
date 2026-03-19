import { Suspense } from "react";

import { PromptComposer } from "@/components/verischolar/prompt-composer";
import { TopBar } from "@/components/verischolar/top-bar";
import { WorkspaceClient } from "@/components/verischolar/workspace-client";
import { getSearchResponse } from "@/lib/verischolar/data";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function getQueryValue(rawValue?: string | string[]) {
  if (Array.isArray(rawValue)) {
    return rawValue[0]?.trim() ?? "";
  }

  return rawValue?.trim() ?? "";
}

function HeroShell() {
  return (
    <section className="relative mx-auto flex max-w-[1280px] flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
      <div className="absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(197,154,94,0.18),transparent_72%)] blur-3xl" />
      <div className="relative w-full max-w-[920px] text-center">
        <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.78)] px-4 py-2 text-xs tracking-[0.18em] text-[var(--muted)] uppercase shadow-[var(--shadow-soft)] backdrop-blur-xl">
          Manus-luxe research shell
          <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
          Philippine context aware
        </div>

        <div className="mt-10 space-y-6">
          <p className="text-sm tracking-[0.28em] text-[var(--muted)] uppercase">
            Research, reinvented
          </p>
          <h1 className="type-display text-[3rem] leading-[1.05] text-[var(--ink)] sm:text-[4rem] lg:text-[5rem]">
            What should we verify
            <br />
            for you today?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-8 text-[color:rgba(82,67,56,0.86)] sm:text-lg">
            VeriScholar is a credibility-first research atelier for thesis teams,
            RRL writers, and hackathon finalists who need faster discovery
            without losing academic rigor.
          </p>
        </div>

        <div className="mt-10">
          <PromptComposer />
        </div>
      </div>
    </section>
  );
}

function WorkspaceSkeleton() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr_1fr]">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[360px] animate-pulse rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)]"
          />
        ))}
      </div>
    </section>
  );
}

async function SearchExperience({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = getQueryValue(params.q);

  if (!query) {
    return <HeroShell />;
  }

  const searchResponse = await getSearchResponse(query);

  return (
    <section className="mx-auto max-w-[1440px] space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <div className="sticky top-[88px] z-20 rounded-[2rem] border border-[var(--line)] bg-[rgba(252,248,241,0.72)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <PromptComposer initialQuery={query} compact />
      </div>

      <WorkspaceClient searchResponse={searchResponse} />
    </section>
  );
}

export default function Page(props: PageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <TopBar />

      <main className="relative flex min-h-[calc(100vh-5rem)] flex-col">
        <Suspense fallback={<WorkspaceSkeleton />}>
          <SearchExperience {...props} />
        </Suspense>
      </main>
    </div>
  );
}
