export type CredibilityLabel = "Trusted" | "Review" | "Risk";

export type CitationImpactBand =
  | "Emerging"
  | "Steady"
  | "Influential"
  | "Unknown";

export type RecencyBand = "Fresh" | "Established" | "Archive" | "Unknown";

export type ConfidenceLabel =
  | "High signal"
  | "Moderate signal"
  | "Needs verification";

export type SourceProvider = "Semantic Scholar" | "OpenAlex";

export type LocalityLabel = "Local" | "Foreign" | "Unknown";

export type RetractionStatus = "Retracted" | "Clear" | "Unknown";

export type PredatoryStatus = "Predatory" | "Clear" | "Unknown";

export type JournalQuality =
  | "Recognized academic venue"
  | "Philippine registry match"
  | "Predatory risk match"
  | "Unknown";

export type ScoreInputEffect = "positive" | "negative" | "neutral";

export type ScoreInput = {
  label: string;
  value: string;
  effect: ScoreInputEffect;
  reason: string;
};

export type EvidenceEntry = {
  label: string;
  detail: string;
  source: string;
};

export type ConflictEntry = {
  claim: string;
  supportingSourceIds: string[];
  opposingSourceIds: string[];
  consensusLabel: "Emerging debate" | "Split evidence" | "Context-sensitive";
};

export type CredibilitySummary = {
  score: number;
  label: CredibilityLabel;
  retracted: boolean;
  predatory: boolean;
  retractionStatus: RetractionStatus;
  predatoryStatus: PredatoryStatus;
  citationImpact: CitationImpactBand;
  recencyBand: RecencyBand;
  journalQuality: JournalQuality;
  methodologyNote: string | null;
  scoreInputs: ScoreInput[];
  evidence: EvidenceEntry[];
  explanations: string[];
};

export type ResearchSource = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  summary: string | null;
  keyFinding: string | null;
  doi: string | null;
  url: string | null;
  journal: string | null;
  publisher: string | null;
  journalTier: string | null;
  citationCount: number | null;
  affiliations: string[];
  countryCodes: string[];
  sourceProvider: SourceProvider;
  paperId: string | null;
  openAlexId: string | null;
  localityLabel: LocalityLabel;
  localReason: string;
  retractionStatus: RetractionStatus;
  predatoryStatus: PredatoryStatus;
  missingFields: string[];
  credibility: CredibilitySummary;
};

export type DashboardMetrics = {
  sourceCount: number;
  localCount: number;
  foreignCount: number;
  flaggedCount: number;
  retractedCount: number;
  predatoryCount: number;
  oldSourceCount: number;
  unknownMetadataCount: number;
  averageCitationCount: number;
  averageYear: number;
  ratioLocal: number;
  trustedCount: number;
};

export type AnalysisResult = {
  synthesis: string;
  conflicts: ConflictEntry[];
  researchGaps: string[];
  confidenceNotes: string[];
  citations: string[];
  confidenceLabel: ConfidenceLabel;
  model: string;
  generatedAt: string;
  generatedFromSourceIds: string[];
};

export type SearchResponse = {
  query: string;
  expandedQuery: string | null;
  sources: ResearchSource[];
  fromCache: boolean;
  warnings: string[];
};
