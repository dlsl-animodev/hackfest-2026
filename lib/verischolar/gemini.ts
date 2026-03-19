import "server-only";

import { z } from "zod";

import {
  geminiAnalysisPayloadSchema,
  methodologyNotesSchema,
  queryExpansionSchema,
} from "@/lib/verischolar/schemas";
import type { AnalysisResult, ResearchSource } from "@/lib/verischolar/types";
import { getGeminiConfig } from "@/lib/verischolar/env";

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type QueryExpansionResult = {
  expandedQuery: string;
  rationale: string;
  model: string;
};

function extractJsonObject(rawText: string) {
  const direct = rawText.trim();

  try {
    return JSON.parse(direct);
  } catch {
    const fencedMatch = direct.match(/```json\s*([\s\S]+?)```/i);

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim());
    }

    const firstBrace = direct.indexOf("{");
    const lastBrace = direct.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(direct.slice(firstBrace, lastBrace + 1));
    }

    const firstBracket = direct.indexOf("[");
    const lastBracket = direct.lastIndexOf("]");

    if (firstBracket >= 0 && lastBracket > firstBracket) {
      return JSON.parse(direct.slice(firstBracket, lastBracket + 1));
    }

    throw new Error("Gemini did not return valid JSON.");
  }
}

async function callGeminiJson<T>({
  prompt,
  schema,
  temperature = 0.2,
}: {
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}) {
  const config = getGeminiConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as GeminiGenerateResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini request failed with ${response.status}.`);
  }

  const text = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = schema.safeParse(extractJsonObject(text));

  if (!parsed.success) {
    throw new Error("Gemini returned JSON that did not match the expected schema.");
  }

  return {
    data: parsed.data,
    model: config.model,
  };
}

export async function expandQueryWithGemini(query: string): Promise<QueryExpansionResult | null> {
  const result = await callGeminiJson({
    prompt: [
      "You are helping a student search for academic literature.",
      "Rewrite the user's research question into one strong academic search query.",
      "Keep the meaning the same, preserve the Philippine context when present, and do not invent claims.",
      "Return JSON with keys expandedQuery and rationale.",
      `Question: ${query}`,
    ].join("\n"),
    schema: queryExpansionSchema,
    temperature: 0.1,
  });

  if (!result) {
    return null;
  }

  return {
    ...result.data,
    model: result.model,
  };
}

export async function generateMethodologyNotes(sources: ResearchSource[]) {
  const eligibleSources = sources
    .filter((source) => source.abstract)
    .slice(0, 8)
    .map((source) => ({
      sourceId: source.id,
      title: source.title,
      abstract: source.abstract,
    }));

  if (eligibleSources.length === 0) {
    return null;
  }

  const result = await callGeminiJson({
    prompt: [
      "You are reviewing paper abstracts for an academic source credibility dashboard.",
      "For each source, write one concise methodology note based only on the abstract.",
      "If the abstract does not expose a method, say that the methodology is unclear from the abstract.",
      "Never infer from the title alone.",
      "Return a JSON array of objects with sourceId and methodologyNote.",
      JSON.stringify(eligibleSources),
    ].join("\n"),
    schema: methodologyNotesSchema,
    temperature: 0.1,
  });

  if (!result) {
    return null;
  }

  return {
    model: result.model,
    notesBySourceId: Object.fromEntries(
      result.data.map((entry) => [entry.sourceId, entry.methodologyNote]),
    ),
  };
}

export async function generateBoardAnalysis({
  query,
  sources,
  citations,
}: {
  query: string;
  sources: ResearchSource[];
  citations: string[];
}): Promise<AnalysisResult> {
  const result = await callGeminiJson({
    prompt: [
      "You are an academic research synthesis assistant.",
      "Use only the provided source metadata and abstracts.",
      "Do not invent evidence or source IDs.",
      "Every conflict must reference at least one supporting or opposing source ID from the provided list.",
      "Keep synthesis concise, evidence-grounded, and useful for a student literature review.",
      "Return JSON with keys synthesis, conflicts, researchGaps, confidenceNotes, confidenceLabel.",
      JSON.stringify({
        query,
        sources: sources.map((source) => ({
          id: source.id,
          title: source.title,
          year: source.year,
          abstract: source.abstract,
          journal: source.journal,
          citationCount: source.citationCount,
          localityLabel: source.localityLabel,
          retractionStatus: source.retractionStatus,
          predatoryStatus: source.predatoryStatus,
          credibilityLabel: source.credibility.label,
          methodologyNote: source.credibility.methodologyNote,
          missingFields: source.missingFields,
        })),
      }),
    ].join("\n"),
    schema: geminiAnalysisPayloadSchema,
    temperature: 0.2,
  });

  if (!result) {
    throw new Error("Gemini is not configured for board analysis.");
  }

  const allowedIds = new Set(sources.map((source) => source.id));

  for (const conflict of result.data.conflicts) {
    const ids = [...conflict.supportingSourceIds, ...conflict.opposingSourceIds];

    if (ids.length === 0) {
      throw new Error("Gemini returned a conflict without source evidence.");
    }

    if (ids.some((id) => !allowedIds.has(id))) {
      throw new Error("Gemini referenced a source that is not on the selected board.");
    }
  }

  return {
    ...result.data,
    citations,
    model: result.model,
    generatedAt: new Date().toISOString(),
    generatedFromSourceIds: sources.map((source) => source.id),
  };
}
