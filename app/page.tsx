import { Suspense } from "react";

import { SearchSessionShell } from "@/components/verischolar/search-session-shell";
import { TopBar } from "@/components/verischolar/top-bar";
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

function WorkspaceSkeleton() {
  return (
    <section className="mx-auto max-w-[1120px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`animate-pulse rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.52)] ${
              index === 0 ? "ml-auto h-32 max-w-[560px]" : "h-[300px]"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

async function SearchExperience({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const searchResponse = query ? await getSearchResponse(query) : null;

  return <SearchSessionShell query={query} searchResponse={searchResponse} />;
}

export default function Page(props: PageProps) {
  const resolvedSearchParams = props.searchParams;

  return <PageContent searchParams={resolvedSearchParams} />;
}

async function PageContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const hasQuery = Boolean(getQueryValue(params.q));

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={
        {
          "--topbar-height": hasQuery ? "3.45rem" : "5rem",
        } as React.CSSProperties
      }
    >
      <TopBar compact={hasQuery} />

      <main className="relative flex min-h-[calc(100vh-5rem)] flex-col">
        <Suspense fallback={<WorkspaceSkeleton />}>
          <SearchExperience searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
