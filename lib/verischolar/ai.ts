import "server-only";

import {
  evaluateIfGapAddressed as evaluateIfGapAddressedWithGemini,
  expandQueryWithGemini,
  generateBoardAnalysis as generateBoardAnalysisWithGemini,
  generateMethodologyNotes as generateMethodologyNotesWithGemini,
  generateOverallFindingsSummary as generateOverallFindingsSummaryWithGemini,
  reviewSourceLocalityWithGemini,
  generateSourceInsights as generateSourceInsightsWithGemini,
} from "@/lib/verischolar/gemini";
import type { AnalysisResult, ResearchSource } from "@/lib/verischolar/types";

type QueryExpansionResult = {
  expandedQuery: string;
  rationale: string;
  model: string;
};

type MethodologyNotesResult = {
  model: string;
  notesBySourceId: Record<string, string>;
};

type OverallFindingsSummaryResult = {
  model: string;
  overallFindingsSummary: string;
};

type SourceInsight = {
  summary: string;
  keyFinding: string;
  methodologyNote: string;
};

type SourceInsightsResult = {
  model: string;
  insightsBySourceId: Record<string, SourceInsight>;
};

type GapEvaluationResult = {
  gapAddressed: boolean;
  explanation: string;
  resolvingSourceIds: string[];
};

type LocalityReviewResult = {
  model: string;
  localityBySourceId: Record<
    string,
    {
      sourceId: string;
      localityLabel: "Local" | "Foreign" | "Unknown";
      localReason: string;
    }
  >;
};

type AiProvider = {
  name: string;
  expandQuery(query: string): Promise<QueryExpansionResult | null>;
  generateMethodologyNotes(
    sources: ResearchSource[],
  ): Promise<MethodologyNotesResult | null>;
  generateOverallFindingsSummary(input: {
    query: string;
    sources: ResearchSource[];
  }): Promise<OverallFindingsSummaryResult | null>;
  generateSourceInsights(input: {
    sources: Array<{
      sourceId: string;
      title: string;
      abstract: string | null;
    }>;
  }): Promise<SourceInsightsResult | null>;
  reviewSourceLocality(input: {
    sources: Array<{
      sourceId: string;
      title: string;
      journal: string | null;
      publisher: string | null;
      publicationCountryCode: string | null;
      url: string | null;
      affiliations: string[];
      countryCodes: string[];
    }>;
  }): Promise<LocalityReviewResult | null>;
  generateBoardAnalysis(input: {
    query: string;
    sources: ResearchSource[];
    citations: string[];
  }): Promise<AnalysisResult>;
  evaluateIfGapAddressed(
    gaps: string[],
    sources: ResearchSource[],
  ): Promise<GapEvaluationResult>;
};

function createGeminiProvider(): AiProvider {
  return {
    name: "Gemini",
    expandQuery: (query) => expandQueryWithGemini(query),
    generateMethodologyNotes: (sources) =>
      generateMethodologyNotesWithGemini(sources),
    generateOverallFindingsSummary: (input) =>
      generateOverallFindingsSummaryWithGemini(input),
    generateSourceInsights: (input) => generateSourceInsightsWithGemini(input),
    reviewSourceLocality: (input) => reviewSourceLocalityWithGemini(input),
    generateBoardAnalysis: (input) => generateBoardAnalysisWithGemini(input),
    evaluateIfGapAddressed: (gaps, sources) =>
      evaluateIfGapAddressedWithGemini(gaps, sources),
  };
}

function getAiProviders() {
  return [createGeminiProvider()];
}

async function runOptionalWithFallback<T>(
  operationName: string,
  execute: (provider: AiProvider) => Promise<T | null>,
): Promise<T | null> {
  const providers = getAiProviders();
  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      const result = await execute(provider);

      if (result !== null) {
        return result;
      }
    } catch (error) {
      lastError = error;
      console.error(
        `[AI Fallback] ${provider.name} failed during ${operationName}.`,
        error,
      );
    }
  }

  if (lastError) {
    console.error(
      `[AI Fallback] All providers failed during ${operationName}.`,
      lastError,
    );
  }

  return null;
}

async function runRequiredWithFallback<T>(
  operationName: string,
  execute: (provider: AiProvider) => Promise<T>,
): Promise<T> {
  const providers = getAiProviders();
  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      return await execute(provider);
    } catch (error) {
      lastError = error;
      console.error(
        `[AI Fallback] ${provider.name} failed during ${operationName}.`,
        error,
      );
    }
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : `No AI provider could complete ${operationName}.`,
  );
}

export async function expandQuery(query: string) {
  return runOptionalWithFallback("query expansion", (provider) =>
    provider.expandQuery(query),
  );
}

export async function generateMethodologyNotes(sources: ResearchSource[]) {
  return runOptionalWithFallback("methodology note generation", (provider) =>
    provider.generateMethodologyNotes(sources),
  );
}

export async function generateOverallFindingsSummary(input: {
  query: string;
  sources: ResearchSource[];
}) {
  return runOptionalWithFallback("overall findings summary generation", (provider) =>
    provider.generateOverallFindingsSummary(input),
  );
}

export async function generateSourceInsights(input: {
  sources: Array<{
    sourceId: string;
    title: string;
    abstract: string | null;
  }>;
}) {
  return runOptionalWithFallback("source insight generation", (provider) =>
    provider.generateSourceInsights(input),
  );
}

export async function reviewSourceLocality(input: {
  sources: Array<{
    sourceId: string;
    title: string;
    journal: string | null;
    publisher: string | null;
    publicationCountryCode: string | null;
    url: string | null;
    affiliations: string[];
    countryCodes: string[];
  }>;
}) {
  return runOptionalWithFallback("source locality review", (provider) =>
    provider.reviewSourceLocality(input),
  );
}

export async function generateBoardAnalysis(input: {
  query: string;
  sources: ResearchSource[];
  citations: string[];
}) {
  return runRequiredWithFallback("board analysis generation", (provider) =>
    provider.generateBoardAnalysis(input),
  );
}

export async function evaluateIfGapAddressed(
  gaps: string[],
  sources: ResearchSource[],
) {
  return runRequiredWithFallback("gap evaluation", (provider) =>
    provider.evaluateIfGapAddressed(gaps, sources),
  );
}
