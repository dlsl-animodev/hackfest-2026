import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";

import {
  getCrossrefMailto,
  getOpenAlexMailto,
  getSemanticScholarApiKey,
} from "@/lib/verischolar/env";
import {
  expandQueryWithGemini,
  generateOverallFindingsSummary,
  generateSourceInsights,
} from "@/lib/verischolar/gemini";
import {
  ACADEMIC_VENUE_HINTS,
  PHILIPPINE_DOMAIN_HINTS,
  PHILIPPINE_INSTITUTION_KEYWORDS,
  PHILIPPINE_JOURNAL_REGISTRY,
  PREDATORY_VENUE_PATTERNS,
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
  relation?: Record<string, unknown>;
  "update-to"?: CrossrefUpdate[];
  "updated-by"?: CrossrefUpdate[];
};

type CrossrefResponse = {
  message?: CrossrefWorkMessage;
};

type CrossrefStatus = {
  publisher: string | null;
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
  retractionStatus: RetractionStatus;
  retractionEvidence: string;
};

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

function encodeOpenAlexIdentifier(identifier: string) {
  return encodeURIComponent(identifier);
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

async function fetchJson<T>(provider: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
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
    },
  );

  return (payload.data ?? []).filter((paper) => paper.title);
}

async function fetchOpenAlexSearch(query: string) {
  const url = new URL(getOpenAlexUrl("/works"));
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", "12");

  const payload = await fetchJson<OpenAlexResponse>("OpenAlex", url.toString());
  return payload.results ?? [];
}

async function fetchOpenAlexByDoi(doi: string) {
  const directUrl = getOpenAlexUrl(
    `/works/${encodeOpenAlexIdentifier(`https://doi.org/${doi}`)}`,
  );

  try {
    return await fetchJson<OpenAlexWork>("OpenAlex", directUrl);
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function fetchOpenAlexEnrichment({
  doi,
  title,
}: {
  doi: string | null;
  title: string;
}) {
  if (doi) {
    const byDoi = await fetchOpenAlexByDoi(doi);

    if (byDoi) {
      return byDoi;
    }
  }

  const results = await fetchOpenAlexSearch(title);
  return results[0] ?? null;
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

    return {
      publisher,
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
    );
    const message = payload.message;
    const status = getRetractionStatusFromCrossref(message);

    await writeRetractionCache({
      doi: normalizedDoi,
      status: status.retractionStatus,
      payload: {
        publisher: message?.publisher ?? null,
        crossref: message ?? null,
      },
    });

    return {
      publisher: message?.publisher ?? null,
      retractionStatus: status.retractionStatus,
      evidence: status.evidence,
    };
  } catch {
    return {
      publisher: null,
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
  const haystack = `${journal ?? ""} ${publisher ?? ""}`.toLowerCase();

  if (!haystack.trim()) {
    return "Unknown" as const;
  }

  return PREDATORY_VENUE_PATTERNS.some((pattern) => haystack.includes(pattern))
    ? ("Predatory" as const)
    : ("Clear" as const);
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
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getLocality({
  affiliations,
  countryCodes,
  journal,
  url,
}: {
  affiliations: string[];
  countryCodes: string[];
  journal: string | null;
  url: string | null;
}) {
  if (countryCodes.includes("PH")) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "OpenAlex affiliation metadata includes a Philippine country code.",
    };
  }

  const affiliationsText = affiliations.join(" ").toLowerCase();

  if (
    PHILIPPINE_INSTITUTION_KEYWORDS.some((keyword) =>
      affiliationsText.includes(keyword),
    )
  ) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "Author affiliations match a checked Philippine institution keyword.",
    };
  }

  if (matchPhilippineJournal(journal)) {
    return {
      localityLabel: "Local" as const,
      localReason:
        "Journal metadata matches the checked-in Philippine journal registry.",
    };
  }

  const hostname = getHostname(url);

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

  if (
    countryCodes.length > 0 ||
    affiliations.length > 0 ||
    journal ||
    hostname
  ) {
    return {
      localityLabel: "Foreign" as const,
      localReason:
        "No Philippine affiliation, venue, or domain signal was detected in the available metadata.",
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
  journalQuality,
  methodologyNote,
  missingFields,
  retractionEvidence,
}: {
  citationCount: number | null;
  year: number | null;
  retractionStatus: RetractionStatus;
  predatoryStatus: PredatoryStatus;
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
        "The venue or publisher matches the checked-in predatory watchlist.",
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
  const predatoryStatus = matchPredatoryVenue(
    candidate.journal,
    candidate.publisher,
  );
  const locality = getLocality({
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
    journalTier: null,
    citationCount: candidate.citationCount,
    affiliations: candidate.affiliations,
    countryCodes: candidate.countryCodes,
    sourceProvider: candidate.sourceProvider,
    paperId: candidate.paperId,
    openAlexId: candidate.openAlexId,
    localityLabel: locality.localityLabel,
    localReason: locality.localReason,
    retractionStatus: candidate.retractionStatus,
    predatoryStatus,
    missingFields,
    credibility: buildCredibility({
      citationCount: candidate.citationCount,
      year: candidate.year,
      retractionStatus: candidate.retractionStatus,
      predatoryStatus,
      journalQuality,
      methodologyNote,
      missingFields,
      retractionEvidence: candidate.retractionEvidence,
    }),
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
  if (semanticScholarUrl) {
    return semanticScholarUrl;
  }

  if (openAlexUrl) {
    return openAlexUrl;
  }

  if (doi) {
    return `https://doi.org/${doi}`;
  }

  return null;
}

async function normalizeSemanticScholarPaper(paper: SemanticScholarPaper) {
  const doi = normalizeDoi(paper.externalIds?.DOI);
  const [openAlex, crossref] = await Promise.all([
    fetchOpenAlexEnrichment({
      doi,
      title: paper.title ?? "",
    }).catch(() => null),
    getCrossrefStatus(doi).catch(() => null),
  ]);

  const openAlexAbstract = rebuildAbstract(openAlex?.abstract_inverted_index);
  const openAlexJournal =
    openAlex?.primary_location?.source?.display_name ?? null;

  return {
    sourceProvider: "Semantic Scholar" as const,
    paperId: paper.paperId ?? null,
    openAlexId: openAlex?.id ?? null,
    title: normalizeWhitespace(paper.title ?? "Untitled source"),
    authors: uniqueStrings(
      (paper.authors ?? []).map((author) => author.name ?? null),
    ),
    year: paper.year ?? openAlex?.publication_year ?? null,
    abstract: paper.abstract?.trim() || openAlexAbstract,
    doi,
    url: getSourceUrl({
      doi,
      semanticScholarUrl: paper.url,
      openAlexUrl: openAlex?.primary_location?.landing_page_url,
    }),
    journal: openAlexJournal ?? paper.venue ?? null,
    publisher:
      crossref?.publisher ??
      openAlex?.primary_location?.source?.host_organization_name ??
      null,
    citationCount: paper.citationCount ?? openAlex?.cited_by_count ?? null,
    affiliations: openAlex ? getOpenAlexAffiliations(openAlex) : [],
    countryCodes: openAlex ? getOpenAlexCountryCodes(openAlex) : [],
    retractionStatus:
      crossref?.retractionStatus ??
      (openAlex?.is_retracted === true
        ? "Retracted"
        : openAlex?.is_retracted === false
          ? "Clear"
          : "Unknown"),
    retractionEvidence:
      crossref?.evidence ??
      (openAlex?.is_retracted === true
        ? "OpenAlex marks this work as retracted."
        : openAlex?.is_retracted === false
          ? "OpenAlex does not flag this work as retracted."
          : "Retraction metadata was unavailable for this source."),
  } satisfies NormalizedCandidate;
}

async function normalizeOpenAlexWork(work: OpenAlexWork) {
  const doi = normalizeDoi(work.doi);
  const crossref = await getCrossrefStatus(doi).catch(() => null);

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
    publisher:
      crossref?.publisher ??
      work.primary_location?.source?.host_organization_name ??
      null,
    citationCount: work.cited_by_count ?? null,
    affiliations: getOpenAlexAffiliations(work),
    countryCodes: getOpenAlexCountryCodes(work),
    retractionStatus:
      crossref?.retractionStatus ??
      (work.is_retracted === true
        ? "Retracted"
        : work.is_retracted === false
          ? "Clear"
          : "Unknown"),
    retractionEvidence:
      crossref?.evidence ??
      (work.is_retracted === true
        ? "OpenAlex marks this work as retracted."
        : work.is_retracted === false
          ? "OpenAlex does not flag this work as retracted."
          : "Retraction metadata was unavailable for this source."),
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
  async (query: string): Promise<SearchResponse> => {
    const rawQuery = query.trim();

    if (!rawQuery) {
      return {
        query,
        expandedQuery: null,
        overallFindingsSummary: null,
        sources: [],
        fromCache: false,
        warnings: [],
      };
    }

    const normalized = normalizeQuery(rawQuery);
    const cachedResponse = await readQueryCache(normalized);

    if (cachedResponse) {
      const cachedWarnings = new Set(cachedResponse.warnings);
      let overallFindingsSummary = cachedResponse.overallFindingsSummary;

      try {
        overallFindingsSummary = await generateOverallFindingsSummaryForQuery({
          query: rawQuery,
          sources: cachedResponse.sources,
        });
      } catch {
        cachedWarnings.add(
          "AI overall findings summary is unavailable for this cache hit, so only per-source summaries are shown.",
        );
      }

      return {
        ...cachedResponse,
        query: rawQuery,
        overallFindingsSummary,
        fromCache: true,
        warnings: [...cachedWarnings],
      };
    }

    const warnings = new Set<string>();
    let expandedQuery: string | null = null;

    try {
      const expansion = await expandQueryWithGemini(rawQuery);

      if (expansion) {
        expandedQuery = expansion.expandedQuery;
      } else {
        warnings.add(
          "Gemini query expansion is unavailable, so the raw research question was used.",
        );
      }
    } catch {
      warnings.add(
        "Gemini query expansion failed, so the raw research question was used.",
      );
    }

    const searchTerm = expandedQuery ?? rawQuery;
    let candidates: NormalizedCandidate[] = [];
    const semanticScholarApiKey = getSemanticScholarApiKey();

    if (semanticScholarApiKey) {
      try {
        const semanticScholarResults =
          await fetchSemanticScholarResults(searchTerm);
        candidates = await Promise.all(
          semanticScholarResults.map((paper) =>
            normalizeSemanticScholarPaper(paper),
          ),
        );
      } catch (error) {
        warnings.add(toWarningMessage(error, "Semantic Scholar", true));
      }
    } else {
      warnings.add(
        "Semantic Scholar API key is not configured, so VeriScholar is using OpenAlex-first live search for now.",
      );
    }

    try {
      if (candidates.length < 10) {
        const openAlexResults = await fetchOpenAlexSearch(searchTerm);
        const normalizedOpenAlex = await Promise.all(
          openAlexResults.map((work) => normalizeOpenAlexWork(work)),
        );
        candidates = dedupeCandidates([...candidates, ...normalizedOpenAlex]);

        if (candidates.length > 0 && normalizedOpenAlex.length > 0) {
          warnings.add(
            "OpenAlex metadata was used to enrich results and fill gaps in provider coverage.",
          );
        }
      }
    } catch (error) {
      warnings.add(toWarningMessage(error, "OpenAlex"));
    }

    const uniqueCandidates = dedupeCandidates(candidates).slice(0, 12);
    let sources = uniqueCandidates.map((candidate) =>
      toResearchSource(candidate, {
        summary: null,
        keyFinding: null,
        methodologyNote: null,
      }),
    );

    try {
      const sourceInsightsResult = await generateSourceInsights({
        sources: uniqueCandidates.map((candidate) => ({
          sourceId: buildSourceId(candidate),
          title: candidate.title,
          abstract: candidate.abstract,
        })),
      });

      if (sourceInsightsResult) {
        sources = uniqueCandidates.map((candidate) => {
          const sourceId = buildSourceId(candidate);
          const insight = sourceInsightsResult.insightsBySourceId[sourceId];

          return toResearchSource(candidate, {
            summary: insight?.summary ?? null,
            keyFinding: insight?.keyFinding ?? null,
            methodologyNote: insight?.methodologyNote ?? null,
          });
        });
      } else {
        warnings.add(
          "Gemini source insights are unavailable, so per-source Summary and Key finding are hidden for this run.",
        );
      }
    } catch {
      warnings.add(
        "Gemini source insights failed, so per-source Summary and Key finding are hidden for this run.",
      );
    }

    sources = sortSources(sources);

    if (sources.length === 0) {
      warnings.add(
        "No live sources were returned for this query. Try a broader phrasing or check provider limits.",
      );
    }

    let overallFindingsSummary: string | null = null;

    try {
      overallFindingsSummary = await generateOverallFindingsSummaryForQuery({
        query: rawQuery,
        sources,
      });

      if (
        !overallFindingsSummary &&
        sources.some((source) => source.abstract)
      ) {
        warnings.add(
          "AI overall findings summary is unavailable for this run, so only per-source summaries are shown.",
        );
      }
    } catch {
      warnings.add(
        "AI overall findings summary failed for this run, so only per-source summaries are shown.",
      );
    }

    const response = {
      query: rawQuery,
      expandedQuery,
      overallFindingsSummary,
      sources,
      fromCache: false,
      warnings: [...warnings],
    } satisfies SearchResponse;

    await writeQueryCache(response);
    await Promise.all(response.sources.map((source) => writeWorkCache(source)));

    return response;
  },
);

export const getSearchResults = cache(async (query: string) => {
  const response = await getSearchResponse(query);
  return response.sources;
});

export async function getSelectedSources(query: string, ids: string[]) {
  const response = await getSearchResponse(query);
  const selectedIds = new Set(ids);
  return response.sources.filter((source) => selectedIds.has(source.id));
}
