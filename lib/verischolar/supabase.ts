import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/verischolar/env";
import {
  analysisResultSchema,
  researchSourceSchema,
  searchResponseSchema,
  workplaceSessionSchema,
} from "@/lib/verischolar/schemas";
import type {
  AnalysisResult,
  ResearchSource,
  SearchMode,
  SearchResponse,
  WorkplaceSession,
} from "@/lib/verischolar/types";

let cachedClient: SupabaseClient | null | undefined;
const QUERY_CACHE_VERSION = "v6";

function getVersionedQueryKey(
  normalizedQuery: string,
  searchMode: SearchMode = "all",
) {
  return `${QUERY_CACHE_VERSION}:${searchMode}:${normalizedQuery}`;
}

function getSupabaseAdminClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const config = getSupabaseConfig();

  if (!config) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

function getIsoNow() {
  return new Date().toISOString();
}

export async function readQueryCache(
  normalizedQuery: string,
  searchMode: SearchMode = "all",
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("query_cache")
    .select("query, expanded_query, payload, warnings")
    .eq("normalized_query", getVersionedQueryKey(normalizedQuery, searchMode))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const payload =
    typeof data.payload === "object" && data.payload ? data.payload : null;
  const sources =
    Array.isArray(data.payload)
      ? data.payload
      : payload &&
          "sources" in payload &&
          Array.isArray((payload as { sources?: unknown }).sources)
        ? (payload as { sources: unknown[] }).sources
        : [];
  const overallFindingsSummary =
    payload &&
    "overallFindingsSummary" in payload &&
    (typeof (payload as { overallFindingsSummary?: unknown })
      .overallFindingsSummary === "string" ||
      (payload as { overallFindingsSummary?: unknown }).overallFindingsSummary ===
        null)
      ? ((payload as { overallFindingsSummary: string | null })
          .overallFindingsSummary ?? null)
      : null;
  const cachedSearchMode =
    payload &&
    "searchMode" in payload &&
    ((payload as { searchMode?: unknown }).searchMode === "all" ||
      (payload as { searchMode?: unknown }).searchMode === "local")
      ? ((payload as { searchMode: SearchMode }).searchMode ?? searchMode)
      : searchMode;

  const parsed = searchResponseSchema.safeParse({
    query: data.query,
    searchMode: cachedSearchMode,
    expandedQuery: data.expanded_query,
    overallFindingsSummary,
    sources,
    fromCache: true,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  });

  return parsed.success ? parsed.data : null;
}

export async function writeQueryCache(response: SearchResponse) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase.from("query_cache").upsert(
    {
      normalized_query: getVersionedQueryKey(
        response.query.trim().toLowerCase(),
        response.searchMode,
      ),
      query: response.query,
      expanded_query: response.expandedQuery,
      payload: {
        searchMode: response.searchMode,
        sources: response.sources,
        overallFindingsSummary: response.overallFindingsSummary,
      },
      warnings: response.warnings,
      updated_at: getIsoNow(),
    },
    {
      onConflict: "normalized_query",
    },
  );
}

export async function writeWorkCache(source: ResearchSource) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase.from("work_cache").upsert(
    {
      cache_key: source.id,
      doi: source.doi,
      semantic_scholar_paper_id: source.paperId,
      openalex_id: source.openAlexId,
      payload: source,
      updated_at: getIsoNow(),
    },
    {
      onConflict: "cache_key",
    },
  );
}

export async function readRetractionCache(doi: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("retraction_cache")
    .select("status, payload")
    .eq("doi", doi)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    status: typeof data.status === "string" ? data.status : "Unknown",
    payload: data.payload,
  };
}

export async function writeRetractionCache({
  doi,
  status,
  payload,
}: {
  doi: string;
  status: string;
  payload: unknown;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase.from("retraction_cache").upsert(
    {
      doi,
      status,
      payload,
      checked_at: getIsoNow(),
      updated_at: getIsoNow(),
    },
    {
      onConflict: "doi",
    },
  );
}

export async function readAnalysisCache(selectionHash: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("analysis_cache")
    .select("payload")
    .eq("selection_hash", selectionHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = analysisResultSchema.safeParse(data.payload);
  return parsed.success ? parsed.data : null;
}

export async function writeAnalysisCache({
  selectionHash,
  normalizedQuery,
  sourceIds,
  result,
}: {
  selectionHash: string;
  normalizedQuery: string;
  sourceIds: string[];
  result: AnalysisResult;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase.from("analysis_cache").upsert(
    {
      selection_hash: selectionHash,
      normalized_query: normalizedQuery,
      source_ids: sourceIds,
      model: result.model,
      payload: result,
      updated_at: getIsoNow(),
    },
    {
      onConflict: "selection_hash",
    },
  );
}

export async function writeWorkplaceSession({
  sessionId,
  query,
  selectedSourceIds,
  analysis,
}: {
  sessionId: string;
  query: string;
  selectedSourceIds: string[];
  analysis: AnalysisResult;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error(
      "Workplace storage is not configured. Add Supabase server credentials before creating shared sessions.",
    );
  }

  const { error } = await supabase.from("workplace_sessions").insert({
    session_id: sessionId,
    query,
    selected_source_ids: selectedSourceIds,
    analysis_payload: analysis,
    created_at: getIsoNow(),
    updated_at: getIsoNow(),
  });

  if (error) {
    throw new Error(
      "Workplace session could not be saved right now. Review the synthesis in-place or retry once storage is available.",
    );
  }
}

export async function readWorkplaceSession(
  sessionId: string,
): Promise<WorkplaceSession | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("workplace_sessions")
    .select(
      "session_id, query, selected_source_ids, analysis_payload, created_at",
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = workplaceSessionSchema.safeParse({
    sessionId: data.session_id,
    query: data.query,
    selectedSourceIds: Array.isArray(data.selected_source_ids)
      ? data.selected_source_ids
      : [],
    analysis: data.analysis_payload,
    createdAt: data.created_at,
  });

  return parsed.success ? parsed.data : null;
}

export async function listWorkplaceSessions(
  limit = 20,
): Promise<WorkplaceSession[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("workplace_sessions")
    .select(
      "session_id, query, selected_source_ids, analysis_payload, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data
    .map((entry) =>
      workplaceSessionSchema.safeParse({
        sessionId: entry.session_id,
        query: entry.query,
        selectedSourceIds: Array.isArray(entry.selected_source_ids)
          ? entry.selected_source_ids
          : [],
        analysis: entry.analysis_payload,
        createdAt: entry.created_at,
      }),
    )
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}

export function validateCachedSource(value: unknown) {
  const parsed = researchSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateCachedSearchResponse(value: unknown) {
  const parsed = searchResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateCachedAnalysis(value: unknown) {
  const parsed = analysisResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
