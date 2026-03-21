import "server-only";

import { buildApaCitation } from "@/lib/verischolar/citations";
import { getSelectionHash } from "@/lib/verischolar/data";
import { generateBoardAnalysis } from "@/lib/verischolar/ai";
import { readAnalysisCache, writeAnalysisCache } from "@/lib/verischolar/supabase";
import type { AnalysisResult, ResearchSource } from "@/lib/verischolar/types";

function normalizeQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function analyzeResearchBoard(
  query: string,
  sources: ResearchSource[],
): Promise<AnalysisResult> {
  const sourceIds = sources.map((source) => source.id);
  const selectionHash = getSelectionHash(query, sourceIds);
  const cached = await readAnalysisCache(selectionHash);

  if (cached) {
    return cached;
  }

  const citations = sources.map(buildApaCitation);
  const analysis = await generateBoardAnalysis({
    query,
    sources,
    citations,
  });

  await writeAnalysisCache({
    selectionHash,
    normalizedQuery: normalizeQuery(query),
    sourceIds,
    result: analysis,
  });

  return analysis;
}
