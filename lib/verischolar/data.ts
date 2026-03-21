import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";

import {
  getCrossrefMailto,
  getOpenAlexMailto,
  getSemanticScholarApiKey,
} from "@/lib/verischolar/env";
import {
  expandQuery,
  generateOverallFindingsSummary,
  reviewSourceLocality,
  generateSourceInsights,
} from "@/lib/verischolar/ai";
import {
  ACADEMIC_VENUE_HINTS,
  PHILIPPINE_DOMAIN_HINTS,
  PHILIPPINE_INSTITUTION_KEYWORDS,
  PHILIPPINE_JOURNAL_REGISTRY,
  PREDATORY_SAFE_VENUE_PATTERNS,
  PREDATORY_VENUE_HIGH_CONFIDENCE_PATTERNS,
  PREDATORY_VENUE_WEAK_PATTERNS,
} from "@/lib/verischolar/lookup-data";
import {
  readQueryCache,
  readRetractionCache,
  writeQueryCache,
  writeRetractionCache,
  writeWorkCache,
} from "@/lib/verischolar/supabase";
import type {
  CitationImpactBand,
  CredibilitySummary,
  JournalQuality,
  PredatoryStatus,
  RecencyBand,
  ResearchSource,
  RetractionStatus,
  ScoreInput,
  SearchMode,
  SearchResponse,
  SourceProvider,
} from "@/lib/verischolar/types";

type SemanticScholarPaper = {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  url?: string;
  venue?: string;
  authors?: Array<{ name?: string }>;
  externalIds?: { DOI?: string };
};

type SemanticScholarResponse = {
  data?: SemanticScholarPaper[];
};

type OpenAlexInstitution = {
  display_name?: string;
  country_code?: string;
};

type OpenAlexAuthorship = {
  author?: {
    display_name?: string;
  };
  raw_author_name?: string;
  institutions?: OpenAlexInstitution[];
};

type OpenAlexSource = {
  display_name?: string;
  host_organization_name?: string;
  country_code?: string;
};

type OpenAlexWork = {
  id?: string;
  title?: string;
  display_name?: string;
  doi?: string;
  publication_year?: number;
  cited_by_count?: number;
  is_retracted?: boolean;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    landing_page_url?: string;
    source?: OpenAlexSource;
  };
  authorships?: OpenAlexAuthorship[];
};

type OpenAlexResponse = {
  results?: OpenAlexWork[];
};

type CrossrefUpdate = {
  type?: string;
  label?: string;
  source?: string;
};

type CrossrefWorkMessage = {
  DOI?: string;
  publisher?: string;
  "publisher-location"?: string;
  relation?: Record<string, unknown>;
  "update-to"?: CrossrefUpdate[];
  "updated-by"?: CrossrefUpdate[];
};

type CrossrefResponse = {
  message?: CrossrefWorkMessage;
};

type CrossrefStatus = {
  publisher: string | null;
  publisherLocation: string | null;
  retractionStatus: RetractionStatus;
  evidence: string;
};

type NormalizedCandidate = {
  sourceProvider: SourceProvider;
  paperId: string | null;
  openAlexId: string | null;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  doi: string | null;
  url: string | null;
  journal: string | null;
  publisher: string | null;
  citationCount: number | null;
  affiliations: string[];
  countryCodes: string[];
  publicationCountryCode: string | null;
  retractionStatus: RetractionStatus;
  retractionEvidence: string;
};

type TimedAttempt<T> =
  | { status: "ok"; value: T }
  | { status: "timeout" }
  | { status: "error"; error: unknown };

type JsonFetchInit = RequestInit & {
  timeoutMs?: number;
};

const FETCH_TIMEOUT_MS = 3000;
const SEMANTIC_SCHOLAR_TIMEOUT_MS = 2800;
const OPENALEX_TIMEOUT_MS = 3800;
const CROSSREF_TIMEOUT_MS = 900;
const QUERY_EXPANSION_TIMEOUT_MS = 700;
const SOURCE_INSIGHTS_TIMEOUT_MS = 1000;
const LOCALITY_REVIEW_TIMEOUT_MS = 600;
const OVERALL_FINDINGS_TIMEOUT_MS = 900;
const NON_AUTHORITATIVE_HOSTS = new Set([
  "api.openalex.org",
  "api.semanticscholar.org",
  "doi.org",
  "dx.doi.org",
  "openalex.org",
  "semanticscholar.org",
  "www.semanticscholar.org",
]);

class UpstreamError extends Error {
  provider: string;
  status: number;

  constructor(provider: string, status: number, message: string) {
    super(message);
    this.provider = provider;
    this.status = status;
  }
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function stripLegacyLocalQuery(query: string) {
  const trimmed = query.trim();

  if (
    !/country:\s*philippines|\.edu\.ph|\.gov\.ph|metro manila|de la salle|university of the philippines/i.test(
      trimmed,
    )
  ) {
    return trimmed;
  }

  const [baseQuery] = trimmed.split(/\s+AND\s+\(/i);

  return baseQuery?.trim() || trimmed;
}

function hasPhilippineFocus(query: string) {
  return /\b(philippines?|philippine|filipino|metro manila|luzon|visayas|mindanao|university of the philippines|ateneo|de la salle|ust)\b|\.edu\.ph|\.gov\.ph/i.test(
    query,
  );
}

function buildSearchTerm(query: string, searchMode: SearchMode) {
  const sanitizedQuery = stripLegacyLocalQuery(query);

  if (searchMode !== "local") {
    return sanitizedQuery;
  }

  const alreadyMentionsPhilippines = /\bphilippines?\b/i.test(sanitizedQuery);
  const localBiasTerms = hasPhilippineFocus(sanitizedQuery)
    ? alreadyMentionsPhilippines
      ? []
      : ["Philippines"]
    : ["Philippines", "Filipino", "local study"];

  return [sanitizedQuery, ...localBiasTerms].join(" ").trim();
}

function isProviderFailureWarning(warning: string) {
  return (
    warning.includes("was unavailable") ||
    warning.includes("rate limits were hit")
  );
}

function shouldPersistSearchCache(response: SearchResponse) {
  return (
    response.sources.length > 0 ||
    !response.warnings.some(isProviderFailureWarning)
  );
}

async function settleWithin<T>(
  task: Promise<T>,
  timeoutMs: number,
): Promise<TimedAttempt<T>> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<TimedAttempt<T>>((resolve) => {
    timeoutId = setTimeout(() => resolve({ status: "timeout" }), timeoutMs);
  });

  const taskPromise = task
    .then((value) => ({ status: "ok", value }) satisfies TimedAttempt<T>)
    .catch((error) => ({ status: "error", error }) satisfies TimedAttempt<T>);

  const result = await Promise.race([taskPromise, timeoutPromise]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return result;
}

function normalizeDoi(doi: string | null | undefined) {
  if (!doi) {
    return null;
  }

  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:/, "");
}

function normalizeTitle(title: string | null | undefined) {
  if (!title) {
    return "";
  }

  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.map((value) => value?.trim()).filter(Boolean)),
  ] as string[];
}

function getOpenAlexUrl(path: string) {
  const url = new URL(path, "https://api.openalex.org");
  const mailto = getOpenAlexMailto();

  if (mailto) {
    url.searchParams.set("mailto", mailto);
  }

  return url.toString();
}

function getCrossrefUrl(doi: string) {
  const url = new URL(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
  );
  const mailto = getCrossrefMailto();

  if (mailto) {
    url.searchParams.set("mailto", mailto);
  }

  return url.toString();
}

async function fetchJson<T>(provider: string, url: string, init?: JsonFetchInit) {
  const { timeoutMs = FETCH_TIMEOUT_MS, ...requestInit } = init ?? {};
  const response = await fetch(url, {
    ...requestInit,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: "application/json",
      ...(requestInit.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new UpstreamError(
      provider,
      response.status,
      `${provider} request failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as T;
}

function getSemanticScholarHeaders() {
  const apiKey = getSemanticScholarApiKey();

  if (!apiKey) {
    return undefined;
  }

  return {
    "x-api-key": apiKey,
  };
}

async function fetchSemanticScholarResults(query: string) {
  const params = new URLSearchParams({
    query,
    limit: "12",
    fields:
      "paperId,title,abstract,year,citationCount,url,venue,authors,externalIds",
  });

  const payload = await fetchJson<SemanticScholarResponse>(
    "Semantic Scholar",
    `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`,
    {
      headers: getSemanticScholarHeaders(),
      timeoutMs: SEMANTIC_SCHOLAR_TIMEOUT_MS,
    },
  );

  return (payload.data ?? []).filter((paper) => paper.title);
}

async function fetchOpenAlexSearch(query: string) {
  const url = new URL(getOpenAlexUrl("/works"));
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", "12");

  const payload = await fetchJson<OpenAlexResponse>("OpenAlex", url.toString(), {
    timeoutMs: OPENALEX_TIMEOUT_MS,
  });
  return payload.results ?? [];
}

function rebuildAbstract(index: Record<string, number[]> | undefined) {
  if (!index) {
    return null;
  }

  const tokens = Object.entries(index)
    .flatMap(([word, positions]) =>
      positions.map((position) => [position, word] as const),
    )
    .sort((left, right) => left[0] - right[0])
    .map((entry) => entry[1]);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.join(" ");
}

function truncateSentence(text: string, maxLength = 240) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function deriveSummaryAndFindingFromAbstract(abstract: string | null) {
  if (!abstract) {
    return {
      summary: null,
      keyFinding: null,
    };
  }

  const sentences = abstract
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const summary = sentences[0] ? truncateSentence(sentences[0]) : null;
  const keyFinding =
    sentences.find((sentence, index) => index > 0 && sentence.length > 32) ??
    sentences[1] ??
    null;

  return {
    summary,
    keyFinding: keyFinding ? truncateSentence(keyFinding) : null,
  };
}

function getOpenAlexAuthors(work: OpenAlexWork) {
  return uniqueStrings(
    (work.authorships ?? []).map(
      (authorship) =>
        authorship.author?.display_name ?? authorship.raw_author_name ?? null,
    ),
  );
}

function getOpenAlexAffiliations(work: OpenAlexWork) {
  return uniqueStrings(
    (work.authorships ?? []).flatMap((authorship) =>
      (authorship.institutions ?? []).map(
        (institution) => institution.display_name ?? null,
      ),
    ),
  );
}

function getOpenAlexCountryCodes(work: OpenAlexWork) {
  return uniqueStrings(
    (work.authorships ?? []).flatMap((authorship) =>
      (authorship.institutions ?? []).map(
        (institution) => institution.country_code ?? null,
      ),
    ),
  );
}

function hasRetractionRelation(relation: Record<string, unknown> | undefined) {
  if (!relation) {
    return false;
  }

  return Object.entries(relation).some(([key, value]) => {
    if (!key.toLowerCase().includes("retract")) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(value);
  });
}

function getRetractionStatusFromCrossref(
  message: CrossrefWorkMessage | undefined,
) {
  const updates = [
    ...(message?.["update-to"] ?? []),
    ...(message?.["updated-by"] ?? []),
  ];

  const matchedUpdate = updates.find((update) =>
    `${update.type ?? ""} ${update.label ?? ""} ${update.source ?? ""}`
      .toLowerCase()
      .includes("retract"),
  );

  if (matchedUpdate || hasRetractionRelation(message?.relation)) {
    return {
      retractionStatus: "Retracted" as const,
      evidence:
        matchedUpdate?.source === "retraction-watch"
          ? "Crossref Retraction Watch metadata flags this DOI as retracted."
          : "Crossref metadata marks this DOI as retracted or updated by a retraction notice.",
    };
  }

  return {
    retractionStatus: "Clear" as const,
    evidence: "Crossref did not return a retraction marker for this DOI.",
  };
}

async function getCrossrefStatus(
  doi: string | null,
): Promise<CrossrefStatus | null> {
  const normalizedDoi = normalizeDoi(doi);

  if (!normalizedDoi) {
    return null;
  }

  const cached = await readRetractionCache(normalizedDoi);

  if (cached) {
    const payload =
      typeof cached.payload === "object" && cached.payload
        ? cached.payload
        : null;
    const publisher =
      payload && "publisher" in payload && typeof payload.publisher === "string"
        ? payload.publisher
        : null;
    const publisherLocation =
      payload &&
      "publisherLocation" in payload &&
      typeof payload.publisherLocation === "string"
        ? payload.publisherLocation
        : null;

    return {
      publisher,
      publisherLocation,
      retractionStatus:
        cached.status === "Retracted" || cached.status === "Clear"
          ? cached.status
          : "Unknown",
      evidence:
        cached.status === "Retracted"
          ? "Retraction status loaded from Supabase cache."
          : "Crossref retraction result loaded from Supabase cache.",
    };
  }

  try {
    const payload = await fetchJson<CrossrefResponse>(
      "Crossref",
      getCrossrefUrl(normalizedDoi),
      {
        timeoutMs: CROSSREF_TIMEOUT_MS,
      },
    );
    const message = payload.message;
    const status = getRetractionStatusFromCrossref(message);

    await writeRetractionCache({
      doi: normalizedDoi,
      status: status.retractionStatus,
      payload: {
        publisher: message?.publisher ?? null,
        publisherLocation: message?.["publisher-location"] ?? null,
        crossref: message ?? null,
      },
    });

    return {
      publisher: message?.publisher ?? null,
      publisherLocation: message?.["publisher-location"] ?? null,
      retractionStatus: status.retractionStatus,
      evidence: status.evidence,
    };
  } catch {
    return {
      publisher: null,
      publisherLocation: null,
      retractionStatus: "Unknown",
      evidence: "Crossref metadata was unavailable during this lookup.",
    };
  }
}

function getCitationImpact(
  citationCount: number | null,
  year: number | null,
): CitationImpactBand {
  if (citationCount === null || year === null) {
    return "Unknown";
  }

  const age = Math.max(1, new Date().getFullYear() - year);
  const weightedVelocity = citationCount / age;

  if (weightedVelocity >= 20 || citationCount >= 150) {
    return "Influential";
  }

  if (weightedVelocity >= 6 || citationCount >= 30) {
    return "Steady";
  }

  return "Emerging";
}

function getRecencyBand(year: number | null): RecencyBand {
  if (year === null) {
    return "Unknown";
  }

  const age = new Date().getFullYear() - year;

  if (age <= 3) {
    return "Fresh";
  }

  if (age <= 10) {
    return "Established";
  }

  return "Archive";
}

function matchPredatoryVenue(journal: string | null, publisher: string | null) {
  const normalizedJournal = (journal ?? "").toLowerCase();
  const normalizedPublisher = (publisher ?? "").toLowerCase();
  const haystack = `${normalizedJournal} ${normalizedPublisher}`.trim();

  if (!haystack) {
    return {
      status: "Unknown" as const,
      reasons: [] as string[],
    };
  }

  const safeMatches = PREDATORY_SAFE_VENUE_PATTERNS.filter((pattern) =>
    haystack.includes(pattern),
  );

  if (safeMatches.length > 0) {
    return {
      status: "Clear" as const,
      reasons: [],
    };
  }

  const highConfidenceMatches = PREDATORY_VENUE_HIGH_CONFIDENCE_PATTERNS.filter(
    (pattern) => haystack.includes(pattern),
  );

  if (highConfidenceMatches.length > 0) {
    return {
      status: "Predatory" as const,
      reasons: highConfidenceMatches,
    };
  }

  const weakMatches = PREDATORY_VENUE_WEAK_PATTERNS.filter((pattern) =>
    haystack.includes(pattern),
  );

  if (weakMatches.length >= 2) {
    return {
      status: "Predatory" as const,
      reasons: weakMatches,
    };
  }

  return {
    status: "Clear" as const,
    reasons: [],
  };
}

function matchPhilippineJournal(journal: string | null) {
  if (!journal) {
    return false;
  }

  const normalizedJournal = journal.toLowerCase();
  return PHILIPPINE_JOURNAL_REGISTRY.some((entry) =>
    normalizedJournal.includes(entry),
  );
}

function getJournalQuality({
  journal,
  predatoryStatus,
  registryMatch,
}: {
  journal: string | null;
  predatoryStatus: PredatoryStatus;
  registryMatch: boolean;
}): JournalQuality {
  if (predatoryStatus === "Predatory") {
    return "Predatory risk match";
  }

  if (registryMatch) {
    return "Philippine registry match";
  }

  if (
    journal &&
    ACADEMIC_VENUE_HINTS.some((hint) => journal.toLowerCase().includes(hint))
  ) {
    return "Recognized academic venue";
  }

  return "Unknown";
}

function getHostname(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (
      NON_AUTHORITATIVE_HOSTS.has(hostname) ||
      hostname.endsWith(".semanticscholar.org")
    ) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

function isPhilippineAffiliation(affiliations: string[]) {
  const normalizedAffiliations = affiliations.map((value) => value.toLowerCase());

  return normalizedAffiliations.some((affiliation) =>
    PHILIPPINE_INSTITUTION_KEYWORDS.some((keyword) => affiliation.includes(keyword)),
  );
}

function getPublisherLocationCountryCode(location: string | null) {
  if (!location) {
    return null;
  }

  const normalized = location.toLowerCase();

  if (normalized.includes("philippines")) {
    return "PH";
  }

  return null;
}

function getLocality({
  publicationCountryCode,
  affiliations,
  countryCodes,
  journal,
  url,
}: {
  publicationCountryCode: string | null;
  affiliations: string[];
  countryCodes: string[];
  journal: string | null;
  url: string | null;
}) {
  const hostname = getHostname(url);

  if (publicationCountryCode === "PH") {
    return {
      localityLabel: "Local" as const,
      localReason:
        "Publication venue metadata reports a Philippine country code.",
    };
  }

  if (countryCodes.includes("PH")) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "OpenAlex affiliation metadata includes a Philippine country code.",
    };
  }

  if (isPhilippineAffiliation(affiliations)) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "Author affiliations match checked Philippine institution names.",
    };
  }

  if (matchPhilippineJournal(journal)) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "Journal metadata matches the checked-in Philippine journal registry.",
    };
  }

  if (
    hostname &&
    PHILIPPINE_DOMAIN_HINTS.some((suffix) => hostname.endsWith(suffix))
  ) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "The source URL resolves to a Philippine academic or government domain.",
    };
  }

  if (publicationCountryCode && publicationCountryCode !== "PH") {
    return {
      localityLabel: "Foreign" as const,
      localReason:
        "Publication venue metadata reports a non-Philippine country code.",
    };
  }

  if (countryCodes.some((code) => code && code !== "PH")) {
    return {
      localityLabel: "Foreign" as const,
      localReason:
        "Affiliation metadata points to a non-Philippine country code.",
    };
  }

  if (affiliations.length > 0 || journal || hostname) {
    return {
      localityLabel: "Unknown" as const,
      localReason:
        "Available metadata did not establish a reliable Philippine or foreign classification.",
    };
  }

  return {
    localityLabel: "Unknown" as const,
    localReason:
      "There is not enough affiliation or venue metadata to classify this source confidently.",
  };
}

function getMissingFields(candidate: NormalizedCandidate) {
  return [
    candidate.abstract ? null : "Abstract",
    candidate.doi ? null : "DOI",
    candidate.year ? null : "Year",
    candidate.publisher ? null : "Publisher",
    candidate.journal ? null : "Journal",
    candidate.url ? null : "Source URL",
  ].filter(Boolean) as string[];
}

function buildSourceId(candidate: NormalizedCandidate) {
  if (candidate.paperId) {
    return `s2:${candidate.paperId}`;
  }

  const doi = normalizeDoi(candidate.doi);

  if (doi) {
    return `doi:${doi}`;
  }

  if (candidate.openAlexId) {
    return `oa:${candidate.openAlexId.split("/").pop()}`;
  }

  return `work:${createHash("sha1")
    .update(`${normalizeTitle(candidate.title)}|${candidate.year ?? "unknown"}`)
    .digest("hex")
    .slice(0, 12)}`;
}

function scoreRetractionStatus(status: RetractionStatus) {
  if (status === "Retracted") {
    return 3;
  }

  if (status === "Clear") {
    return 2;
  }

  return 1;
}

function mergeCandidates(
  existing: NormalizedCandidate,
  incoming: NormalizedCandidate,
): NormalizedCandidate {
  return {
    sourceProvider:
      existing.sourceProvider === "Semantic Scholar"
        ? existing.sourceProvider
        : incoming.sourceProvider,
    paperId: existing.paperId ?? incoming.paperId,
    openAlexId: existing.openAlexId ?? incoming.openAlexId,
    title: existing.title || incoming.title,
    authors: uniqueStrings([...existing.authors, ...incoming.authors]),
    year: existing.year ?? incoming.year,
    abstract: existing.abstract ?? incoming.abstract,
    doi: existing.doi ?? incoming.doi,
    url: existing.url ?? incoming.url,
    journal: existing.journal ?? incoming.journal,
    publisher: existing.publisher ?? incoming.publisher,
    citationCount: existing.citationCount ?? incoming.citationCount,
    affiliations: uniqueStrings([
      ...existing.affiliations,
      ...incoming.affiliations,
    ]),
    countryCodes: uniqueStrings([
      ...existing.countryCodes,
      ...incoming.countryCodes,
    ]),
    publicationCountryCode:
      existing.publicationCountryCode ?? incoming.publicationCountryCode,
    retractionStatus:
      scoreRetractionStatus(existing.retractionStatus) >=
      scoreRetractionStatus(incoming.retractionStatus)
        ? existing.retractionStatus
        : incoming.retractionStatus,
    retractionEvidence:
      scoreRetractionStatus(existing.retractionStatus) >=
      scoreRetractionStatus(incoming.retractionStatus)
        ? existing.retractionEvidence
        : incoming.retractionEvidence,
  };
}

function dedupeCandidates(candidates: NormalizedCandidate[]) {
  const byKey = new Map<string, NormalizedCandidate>();

  for (const candidate of candidates) {
    const key =
      normalizeDoi(candidate.doi) ??
      `${normalizeTitle(candidate.title)}|${candidate.year ?? "unknown"}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }

    byKey.set(key, mergeCandidates(existing, candidate));
  }

  return [...byKey.values()];
}

function buildCredibility({
  citationCount,
  year,
  retractionStatus,
  predatoryStatus,
  predatoryMatchReasons,
  journalQuality,
  methodologyNote,
  missingFields,
  retractionEvidence,
}: {
  citationCount: number | null;
  year: number | null;
  retractionStatus: RetractionStatus;
  predatoryStatus: PredatoryStatus;
  predatoryMatchReasons: string[];
  journalQuality: JournalQuality;
  methodologyNote: string | null;
  missingFields: string[];
  retractionEvidence: string;
}): CredibilitySummary {
  const scoreInputs: ScoreInput[] = [];
  let score = 62;

  if (retractionStatus === "Retracted") {
    score = 5;
    scoreInputs.push({
      label: "Retraction",
      value: "Retracted",
      effect: "negative",
      reason: "Retracted works are automatically treated as risk sources.",
    });
  } else if (retractionStatus === "Clear") {
    scoreInputs.push({
      label: "Retraction",
      value: "No retraction marker",
      effect: "positive",
      reason: "Crossref did not report a retraction marker for this DOI.",
    });
  } else {
    scoreInputs.push({
      label: "Retraction",
      value: "Unknown",
      effect: "neutral",
      reason: "Retraction metadata could not be confirmed for this record.",
    });
  }

  if (predatoryStatus === "Predatory") {
    score -= 40;
    scoreInputs.push({
      label: "Venue risk",
      value: "Predatory pattern match",
      effect: "negative",
      reason:
        predatoryMatchReasons.length > 0
          ? `Matched flagged venue patterns: ${predatoryMatchReasons.join(", ")}.`
          : "The venue or publisher matches the checked-in predatory watchlist.",
    });
  } else if (predatoryStatus === "Clear") {
    scoreInputs.push({
      label: "Venue risk",
      value: "No predatory match",
      effect: "positive",
      reason: "The venue did not match the checked-in predatory venue list.",
    });
  } else {
    scoreInputs.push({
      label: "Venue risk",
      value: "Unknown",
      effect: "neutral",
      reason:
        "Venue risk could not be checked because publisher metadata was incomplete.",
    });
  }

  const citationImpact = getCitationImpact(citationCount, year);
  const recencyBand = getRecencyBand(year);

  if (citationImpact === "Influential") {
    score += 12;
    scoreInputs.push({
      label: "Citation momentum",
      value: "Influential",
      effect: "positive",
      reason: "Citation momentum is strong relative to the age of the work.",
    });
  } else if (citationImpact === "Steady") {
    score += 5;
    scoreInputs.push({
      label: "Citation momentum",
      value: "Steady",
      effect: "positive",
      reason: "Citation count is healthy for the publication year.",
    });
  } else if (citationImpact === "Emerging") {
    score -= 4;
    scoreInputs.push({
      label: "Citation momentum",
      value: "Emerging",
      effect: "negative",
      reason:
        "Citation support is still limited, so this source needs corroboration.",
    });
  } else {
    scoreInputs.push({
      label: "Citation momentum",
      value: "Unknown",
      effect: "neutral",
      reason: "Citation metadata was incomplete for this source.",
    });
  }

  if (recencyBand === "Fresh") {
    score += 8;
    scoreInputs.push({
      label: "Recency",
      value: "Fresh",
      effect: "positive",
      reason: "The work is recent enough to reflect current discourse.",
    });
  } else if (recencyBand === "Established") {
    score += 3;
    scoreInputs.push({
      label: "Recency",
      value: "Established",
      effect: "positive",
      reason: "The work is recent enough to remain broadly relevant.",
    });
  } else if (recencyBand === "Archive") {
    score -= 8;
    scoreInputs.push({
      label: "Recency",
      value: "Archive",
      effect: "negative",
      reason:
        "The work is older and should be balanced with more recent evidence.",
    });
  } else {
    scoreInputs.push({
      label: "Recency",
      value: "Unknown",
      effect: "neutral",
      reason: "Publication year metadata was incomplete for this source.",
    });
  }

  if (journalQuality === "Philippine registry match") {
    score += 10;
    scoreInputs.push({
      label: "Journal quality",
      value: journalQuality,
      effect: "positive",
      reason: "The venue matched the checked-in Philippine journal registry.",
    });
  } else if (journalQuality === "Recognized academic venue") {
    score += 6;
    scoreInputs.push({
      label: "Journal quality",
      value: journalQuality,
      effect: "positive",
      reason: "Venue metadata reads like a conventional academic publication.",
    });
  } else if (journalQuality === "Predatory risk match") {
    scoreInputs.push({
      label: "Journal quality",
      value: journalQuality,
      effect: "negative",
      reason: "The venue was flagged by the predatory venue lookup.",
    });
  } else {
    scoreInputs.push({
      label: "Journal quality",
      value: "Unknown",
      effect: "neutral",
      reason:
        "Journal quality could not be classified with the available metadata.",
    });
  }

  if (missingFields.length > 0) {
    scoreInputs.push({
      label: "Metadata completeness",
      value: `Missing ${missingFields.join(", ")}`,
      effect: "neutral",
      reason:
        "Some citation fields are incomplete and should be reviewed before final submission.",
    });
  }

  const boundedScore = Math.max(5, Math.min(98, score));
  const label =
    retractionStatus === "Retracted" ||
    predatoryStatus === "Predatory" ||
    boundedScore < 55
      ? "Risk"
      : boundedScore >= 80
        ? "Trusted"
        : "Review";

  return {
    score: boundedScore,
    label,
    retracted: retractionStatus === "Retracted",
    predatory: predatoryStatus === "Predatory",
    retractionStatus,
    predatoryStatus,
    citationImpact,
    recencyBand,
    journalQuality,
    methodologyNote,
    scoreInputs,
    evidence: [
      {
        label: "Retraction check",
        detail: retractionEvidence,
        source: "Crossref",
      },
      ...(methodologyNote
        ? [
            {
              label: "Methodology note",
              detail: methodologyNote,
              source: "Gemini abstract analysis",
            },
          ]
        : []),
    ],
    explanations: scoreInputs.map((input) => input.reason),
  };
}

function toResearchSource(
  candidate: NormalizedCandidate,
  {
    summary,
    keyFinding,
    methodologyNote,
  }: {
    summary: string | null;
    keyFinding: string | null;
    methodologyNote: string | null;
  },
): ResearchSource {
  const predatoryMatch = matchPredatoryVenue(
    candidate.journal,
    candidate.publisher,
  );
  const predatoryStatus = predatoryMatch.status;
  const locality = getLocality({
    publicationCountryCode: candidate.publicationCountryCode,
    affiliations: candidate.affiliations,
    countryCodes: candidate.countryCodes,
    journal: candidate.journal,
    url: candidate.url,
  });
  const missingFields = getMissingFields(candidate);
  const journalQuality = getJournalQuality({
    journal: candidate.journal,
    predatoryStatus,
    registryMatch: matchPhilippineJournal(candidate.journal),
  });

  return {
    id: buildSourceId(candidate),
    title: candidate.title,
    authors: candidate.authors,
    year: candidate.year,
    abstract: candidate.abstract,
    summary,
    keyFinding,
    doi: normalizeDoi(candidate.doi),
    url: candidate.url,
    journal: candidate.journal,
    publisher: candidate.publisher,
    journalTier: journalQuality === "Unknown" ? null : journalQuality,
    citationCount: candidate.citationCount,
    affiliations: candidate.affiliations,
    countryCodes: candidate.countryCodes,
    publicationCountryCode: candidate.publicationCountryCode,
    sourceProvider: candidate.sourceProvider,
    paperId: candidate.paperId,
    openAlexId: candidate.openAlexId,
    localityLabel: locality.localityLabel,
    localReason: locality.localReason,
    retractionStatus: candidate.retractionStatus,
    predatoryStatus,
    predatoryMatchReasons: predatoryMatch.reasons,
    missingFields,
    credibility: buildCredibility({
      citationCount: candidate.citationCount,
      year: candidate.year,
      retractionStatus: candidate.retractionStatus,
      predatoryStatus,
      predatoryMatchReasons: predatoryMatch.reasons,
      journalQuality,
      methodologyNote,
      missingFields,
      retractionEvidence: candidate.retractionEvidence,
    }),
  };
}

async function enhanceUnknownLocalityWithAi(sources: ResearchSource[]) {
  const candidates = sources.filter((source) => source.localityLabel === "Unknown");

  if (candidates.length === 0) {
    return {
      sources,
      updatedCount: 0,
    };
  }

  const reviewed = await reviewSourceLocality({
    sources: candidates.map((source) => ({
      sourceId: source.id,
      title: source.title,
      journal: source.journal,
      publisher: source.publisher,
      publicationCountryCode: source.publicationCountryCode,
      url: source.url,
      affiliations: source.affiliations,
      countryCodes: source.countryCodes,
    })),
  });

  if (!reviewed) {
    return {
      sources,
      updatedCount: 0,
    };
  }

  let updatedCount = 0;

  const nextSources = sources.map((source) => {
    const localReview = reviewed.localityBySourceId[source.id];

    if (!localReview) {
      return source;
    }

    if (source.localityLabel !== "Unknown") {
      return source;
    }

    if (
      source.localityLabel === localReview.localityLabel &&
      source.localReason === localReview.localReason
    ) {
      return source;
    }

    updatedCount += 1;

    return {
      ...source,
      localityLabel: localReview.localityLabel,
      localReason: localReview.localReason,
    };
  });

  return {
    sources: nextSources,
    updatedCount,
  };
}

function sortSources(sources: ResearchSource[]) {
  return [...sources].sort((left, right) => {
    if (right.credibility.score !== left.credibility.score) {
      return right.credibility.score - left.credibility.score;
    }

    if ((right.citationCount ?? 0) !== (left.citationCount ?? 0)) {
      return (right.citationCount ?? 0) - (left.citationCount ?? 0);
    }

    return (right.year ?? 0) - (left.year ?? 0);
  });
}

function getSourceUrl({
  doi,
  semanticScholarUrl,
  openAlexUrl,
}: {
  doi: string | null;
  semanticScholarUrl: string | null | undefined;
  openAlexUrl: string | null | undefined;
}) {
  if (openAlexUrl) {
    return openAlexUrl;
  }

  if (doi) {
    return `https://doi.org/${doi}`;
  }

  if (semanticScholarUrl) {
    return semanticScholarUrl;
  }

  return null;
}

async function normalizeSemanticScholarPaper(paper: SemanticScholarPaper) {
  const doi = normalizeDoi(paper.externalIds?.DOI);
  const crossrefAttempt = doi
    ? await settleWithin(getCrossrefStatus(doi), 1200)
    : ({ status: "ok", value: null } satisfies TimedAttempt<CrossrefStatus | null>);
  const crossref = crossrefAttempt.status === "ok" ? crossrefAttempt.value : null;
  const publicationCountryCode = getPublisherLocationCountryCode(
    crossref?.publisherLocation ?? null,
  );

  return {
    sourceProvider: "Semantic Scholar" as const,
    paperId: paper.paperId ?? null,
    openAlexId: null,
    title: normalizeWhitespace(paper.title ?? "Untitled source"),
    authors: uniqueStrings(
      (paper.authors ?? []).map((author) => author.name ?? null),
    ),
    year: paper.year ?? null,
    abstract: paper.abstract?.trim() || null,
    doi,
    url: getSourceUrl({
      doi,
      semanticScholarUrl: paper.url,
      openAlexUrl: null,
    }),
    journal: paper.venue ?? null,
    publisher: crossref?.publisher ?? null,
    citationCount: paper.citationCount ?? null,
    affiliations: [],
    countryCodes: [],
    publicationCountryCode,
    retractionStatus: crossref?.retractionStatus ?? "Unknown",
    retractionEvidence:
      crossref?.evidence ?? "Retraction metadata was unavailable for this source.",
  } satisfies NormalizedCandidate;
}

async function normalizeOpenAlexWork(work: OpenAlexWork) {
  const doi = normalizeDoi(work.doi);
  const publicationCountryCode = work.primary_location?.source?.country_code ?? null;

  return {
    sourceProvider: "OpenAlex" as const,
    paperId: null,
    openAlexId: work.id ?? null,
    title: normalizeWhitespace(
      work.display_name ?? work.title ?? "Untitled source",
    ),
    authors: getOpenAlexAuthors(work),
    year: work.publication_year ?? null,
    abstract: rebuildAbstract(work.abstract_inverted_index),
    doi,
    url: getSourceUrl({
      doi,
      semanticScholarUrl: null,
      openAlexUrl: work.primary_location?.landing_page_url,
    }),
    journal: work.primary_location?.source?.display_name ?? null,
    publisher: work.primary_location?.source?.host_organization_name ?? null,
    citationCount: work.cited_by_count ?? null,
    affiliations: getOpenAlexAffiliations(work),
    countryCodes: getOpenAlexCountryCodes(work),
    publicationCountryCode,
    retractionStatus:
      work.is_retracted === true
        ? "Retracted"
        : work.is_retracted === false
          ? "Clear"
          : "Unknown",
    retractionEvidence:
      work.is_retracted === true
        ? "OpenAlex marks this work as retracted."
        : work.is_retracted === false
          ? "OpenAlex does not flag this work as retracted."
          : "Retraction metadata was unavailable for this source.",
  } satisfies NormalizedCandidate;
}

function toWarningMessage(
  error: unknown,
  provider: string,
  fallbackToOtherProvider = false,
) {
  if (error instanceof UpstreamError && error.status === 429) {
    return `${provider} rate limits were hit${
      fallbackToOtherProvider
        ? ", so VeriScholar switched to another live source where possible."
        : "."
    }`;
  }

  if (error instanceof Error) {
    return `${provider} was unavailable during this request.`;
  }

  return `${provider} was unavailable during this request.`;
}

async function generateOverallFindingsSummaryForQuery({
  query,
  sources,
}: {
  query: string;
  sources: ResearchSource[];
}) {
  if (sources.length === 0) {
    return null;
  }

  const result = await generateOverallFindingsSummary({
    query,
    sources,
  });

  return result?.overallFindingsSummary ?? null;
}

export function getSelectionHash(query: string, ids: string[]) {
  return createHash("sha256")
    .update(`${normalizeQuery(query)}::${[...ids].sort().join("|")}`)
    .digest("hex");
}

export const getSearchResponse = cache(
  async (
    query: string,
    searchMode: SearchMode = "all",
  ): Promise<SearchResponse> => {
    const rawQuery = query.trim();

    if (!rawQuery) {
      return {
        query,
        searchMode,
        expandedQuery: null,
        overallFindingsSummary: null,
        sources: [],
        fromCache: false,
        warnings: [],
      };
    }

    const normalized = normalizeQuery(rawQuery);
    const cachedResponse = await readQueryCache(normalized, searchMode);

    if (cachedResponse) {
      return {
        ...cachedResponse,
        query: rawQuery,
        searchMode,
        fromCache: true,
      };
    }

    const warnings = new Set<string>();
    let expandedQuery: string | null = null;

    const expansionAttempt = await settleWithin(
      expandQuery(rawQuery),
      QUERY_EXPANSION_TIMEOUT_MS,
    );

    if (expansionAttempt.status === "ok") {
      if (expansionAttempt.value) {
        expandedQuery = expansionAttempt.value.expandedQuery;
      } else {
        warnings.add(
          "AI query expansion is unavailable, so the raw research question was used.",
        );
      }
    } else if (expansionAttempt.status === "timeout") {
      warnings.add(
        "AI query expansion timed out to keep the search moving, so the raw research question was used.",
      );
    } else {
      warnings.add(
        "AI query expansion failed, so the raw research question was used.",
      );
    }

    const searchTerm = buildSearchTerm(expandedQuery ?? rawQuery, searchMode);
    const [semanticScholarSearch, openAlexSearch] = await Promise.allSettled([
      fetchSemanticScholarResults(searchTerm),
      fetchOpenAlexSearch(searchTerm),
    ]);

    const semanticScholarResults =
      semanticScholarSearch.status === "fulfilled"
        ? semanticScholarSearch.value
        : [];
    const openAlexResults =
      openAlexSearch.status === "fulfilled" ? openAlexSearch.value : [];

    if (semanticScholarSearch.status === "rejected") {
      warnings.add(
        toWarningMessage(semanticScholarSearch.reason, "Semantic Scholar", true),
      );
    }

    if (openAlexSearch.status === "rejected") {
      warnings.add(toWarningMessage(openAlexSearch.reason, "OpenAlex"));
    } else if (openAlexResults.length > 0) {
      warnings.add(
        "OpenAlex metadata was used to enrich results and fill gaps in provider coverage.",
      );
    }

    const [normalizedSemantic, normalizedOpenAlex] = await Promise.all([
      Promise.all(
        semanticScholarResults.map((paper) => normalizeSemanticScholarPaper(paper)),
      ),
      Promise.all(openAlexResults.map((work) => normalizeOpenAlexWork(work))),
    ]);

    const uniqueCandidates = dedupeCandidates([
      ...normalizedSemantic,
      ...normalizedOpenAlex,
    ]).slice(0, 12);
    const fallbackDetailsBySourceId = new Map(
      uniqueCandidates.map((candidate) => {
        const fallback = deriveSummaryAndFindingFromAbstract(candidate.abstract);

        return [
          buildSourceId(candidate),
          {
            summary: fallback.summary,
            keyFinding: fallback.keyFinding,
          },
        ] as const;
      }),
    );
    let sources = uniqueCandidates.map((candidate) => {
      const fallback = fallbackDetailsBySourceId.get(buildSourceId(candidate)) ?? {
        summary: null,
        keyFinding: null,
      };

      return toResearchSource(candidate, {
        summary: fallback.summary,
        keyFinding: fallback.keyFinding,
        methodologyNote: null,
      });
    });

    const [sourceInsightsAttempt, localityAttempt, overallSummaryAttempt] =
      await Promise.all([
        settleWithin(
          generateSourceInsights({
            sources: uniqueCandidates.map((candidate) => ({
              sourceId: buildSourceId(candidate),
              title: candidate.title,
              abstract: candidate.abstract,
            })),
          }),
          SOURCE_INSIGHTS_TIMEOUT_MS,
        ),
        settleWithin(
          enhanceUnknownLocalityWithAi(sources),
          LOCALITY_REVIEW_TIMEOUT_MS,
        ),
        searchMode === "local"
          ? Promise.resolve({
              status: "ok",
              value: null,
            } satisfies TimedAttempt<string | null>)
          : settleWithin(
              generateOverallFindingsSummaryForQuery({
                query: rawQuery,
                sources,
              }),
              OVERALL_FINDINGS_TIMEOUT_MS,
            ),
      ]);

    if (sourceInsightsAttempt.status === "ok") {
      const sourceInsightsResult = sourceInsightsAttempt.value;

      if (sourceInsightsResult) {
        sources = uniqueCandidates.map((candidate) => {
          const sourceId = buildSourceId(candidate);
          const insight = sourceInsightsResult.insightsBySourceId[sourceId];
          const fallback = fallbackDetailsBySourceId.get(sourceId) ?? {
            summary: null,
            keyFinding: null,
          };

          return toResearchSource(candidate, {
            summary: insight?.summary ?? fallback.summary,
            keyFinding: insight?.keyFinding ?? fallback.keyFinding,
            methodologyNote: insight?.methodologyNote ?? null,
          });
        });
      } else {
        warnings.add(
          "AI source insights are unavailable, so per-source Summary and Key finding were generated with abstract slicing fallback.",
        );
      }
    } else if (sourceInsightsAttempt.status === "timeout") {
      warnings.add(
        "AI source insights timed out to keep search responsive, so per-source Summary and Key finding were generated with abstract slicing fallback.",
      );
    } else {
      warnings.add(
        "AI source insights failed, so per-source Summary and Key finding were generated with abstract slicing fallback.",
      );
    }

    if (localityAttempt.status === "ok") {
      const localityBySourceId = new Map(
        localityAttempt.value.sources.map((source) => [
          source.id,
          {
            localityLabel: source.localityLabel,
            localReason: source.localReason,
          },
        ]),
      );

      sources = sources.map((source) => {
        const locality = localityBySourceId.get(source.id);

        if (!locality) {
          return source;
        }

        return {
          ...source,
          localityLabel: locality.localityLabel,
          localReason: locality.localReason,
        };
      });

      if (localityAttempt.value.updatedCount > 0) {
        warnings.add(
          `AI locality review clarified ${localityAttempt.value.updatedCount} source locality label(s).`,
        );
      }
    } else if (localityAttempt.status === "timeout") {
      warnings.add(
        "AI locality review timed out to keep search responsive, so API-only locality checks were used.",
      );
    } else {
      warnings.add(
        "AI locality review was unavailable for this run, so API-only locality checks were used.",
      );
    }

    sources = sortSources(sources);

    if (searchMode === "local" && sources.length > 0) {
      const confirmedLocalSources = sources.filter(
        (source) => source.localityLabel === "Local",
      );

      if (confirmedLocalSources.length > 0) {
        const uncertainLocalitySources = sources.filter(
          (source) => source.localityLabel === "Unknown",
        );

        sources = [
          ...sortSources(confirmedLocalSources),
          ...sortSources(uncertainLocalitySources),
        ];

        warnings.add(
          uncertainLocalitySources.length > 0
            ? `Showing ${confirmedLocalSources.length} confirmed local source${
                confirmedLocalSources.length === 1 ? "" : "s"
              } first, plus ${uncertainLocalitySources.length} locality-uncertain candidate${
                uncertainLocalitySources.length === 1 ? "" : "s"
              }.`
            : `Showing ${confirmedLocalSources.length} source${
                confirmedLocalSources.length === 1 ? "" : "s"
              } with Philippine locality signals.`,
        );
      } else {
        const possibleLocalSources = sources.filter(
          (source) => source.localityLabel !== "Foreign",
        );

        if (possibleLocalSources.length > 0) {
          sources = sortSources(possibleLocalSources);
          warnings.add(
            "No confidently local papers were confirmed from metadata, so locality-uncertain candidates are shown.",
          );
        } else {
          warnings.add(
            "No confidently local papers were found for this query, so broader results are shown.",
          );
        }
      }
    }

    if (sources.length === 0) {
      warnings.add(
        "No live sources were returned for this query. Try a broader phrasing or check provider limits.",
      );
    }

    let overallFindingsSummary: string | null = null;

    if (overallSummaryAttempt.status === "ok") {
      overallFindingsSummary = overallSummaryAttempt.value;

      if (
        searchMode === "all" &&
        !overallFindingsSummary &&
        sources.some((source) => source.abstract)
      ) {
        warnings.add(
          "AI overall findings summary is unavailable for this run, so only per-source summaries are shown.",
        );
      }
    } else if (
      searchMode === "all" &&
      sources.some((source) => source.abstract)
    ) {
      warnings.add(
        overallSummaryAttempt.status === "timeout"
          ? "AI overall findings summary timed out to keep search responsive, so only per-source summaries are shown."
          : "AI overall findings summary failed for this run, so only per-source summaries are shown.",
      );
    }

    const response = {
      query: rawQuery,
      searchMode,
      expandedQuery,
      overallFindingsSummary,
      sources,
      fromCache: false,
      warnings: [...warnings],
    } satisfies SearchResponse;

    if (shouldPersistSearchCache(response)) {
      await writeQueryCache(response);
    }
    await Promise.all(response.sources.map((source) => writeWorkCache(source)));

    return response;
  },
);

export const getSearchResults = cache(
  async (query: string, searchMode: SearchMode = "all") => {
    const response = await getSearchResponse(query, searchMode);
    return response.sources;
  },
);

export async function getSelectedSources(
  query: string,
  ids: string[],
  searchMode: SearchMode = "all",
) {
  const response = await getSearchResponse(query, searchMode);
  const selectedIds = new Set(ids);
  return response.sources.filter((source) => selectedIds.has(source.id));
}
