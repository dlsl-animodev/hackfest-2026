import { z } from "zod";

export const credibilityLabelSchema = z.enum(["Trusted", "Review", "Risk"]);

export const citationImpactBandSchema = z.enum([
  "Emerging",
  "Steady",
  "Influential",
  "Unknown",
]);

export const recencyBandSchema = z.enum([
  "Fresh",
  "Established",
  "Archive",
  "Unknown",
]);

export const confidenceLabelSchema = z.enum([
  "High signal",
  "Moderate signal",
  "Needs verification",
]);

export const sourceProviderSchema = z.enum(["Semantic Scholar", "OpenAlex"]);

export const localityLabelSchema = z.enum(["Local", "Foreign", "Unknown"]);

export const retractionStatusSchema = z.enum(["Retracted", "Clear", "Unknown"]);

export const predatoryStatusSchema = z.enum(["Predatory", "Clear", "Unknown"]);

export const journalQualitySchema = z.enum([
  "Recognized academic venue",
  "Philippine registry match",
  "Predatory risk match",
  "Unknown",
]);

export const scoreInputSchema = z
  .object({
    label: z.string().min(1),
    value: z.string().min(1),
    effect: z.enum(["positive", "negative", "neutral"]),
    reason: z.string().min(1),
  })
  .strict();

export const evidenceEntrySchema = z
  .object({
    label: z.string().min(1),
    detail: z.string().min(1),
    source: z.string().min(1),
  })
  .strict();

export const credibilitySummarySchema = z
  .object({
    score: z.number().min(0).max(100),
    label: credibilityLabelSchema,
    retracted: z.boolean(),
    predatory: z.boolean(),
    retractionStatus: retractionStatusSchema,
    predatoryStatus: predatoryStatusSchema,
    citationImpact: citationImpactBandSchema,
    recencyBand: recencyBandSchema,
    journalQuality: journalQualitySchema,
    methodologyNote: z.string().nullable(),
    scoreInputs: z.array(scoreInputSchema),
    evidence: z.array(evidenceEntrySchema),
    explanations: z.array(z.string()),
  })
  .strict();

export const researchSourceSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    authors: z.array(z.string()),
    year: z.number().int().nullable(),
    abstract: z.string().nullable(),
    summary: z.string().nullable(),
    keyFinding: z.string().nullable(),
    doi: z.string().nullable(),
    url: z.string().url().nullable(),
    journal: z.string().nullable(),
    publisher: z.string().nullable(),
    journalTier: z.string().nullable(),
    citationCount: z.number().int().nonnegative().nullable(),
    affiliations: z.array(z.string()),
    countryCodes: z.array(z.string()),
    sourceProvider: sourceProviderSchema,
    paperId: z.string().nullable(),
    openAlexId: z.string().nullable(),
    localityLabel: localityLabelSchema,
    localReason: z.string().min(1),
    retractionStatus: retractionStatusSchema,
    predatoryStatus: predatoryStatusSchema,
    missingFields: z.array(z.string()),
    credibility: credibilitySummarySchema,
  })
  .strict();

export const conflictEntrySchema = z
  .object({
    claim: z.string().min(1),
    supportingSourceIds: z.array(z.string()),
    opposingSourceIds: z.array(z.string()),
    consensusLabel: z.enum([
      "Emerging debate",
      "Split evidence",
      "Context-sensitive",
    ]),
  })
  .strict();

export const analysisResultSchema = z
  .object({
    synthesis: z.string().min(1),
    conflicts: z.array(conflictEntrySchema),
    researchGaps: z.array(z.string().min(1)),
    confidenceNotes: z.array(z.string().min(1)),
    citations: z.array(z.string().min(1)),
    confidenceLabel: confidenceLabelSchema,
    model: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    generatedFromSourceIds: z.array(z.string().min(1)),
  })
  .strict();

export const geminiAnalysisPayloadSchema = z
  .object({
    synthesis: z.string().min(1),
    conflicts: z.array(conflictEntrySchema),
    // Wrap researchGaps if Gemini sends a plain string instead of an array
    researchGaps: z.preprocess(
      (val) => {
        if (typeof val === "string") return [val];
        if (Array.isArray(val)) return val;
        return ["No specific gaps identified."]; // Fallback
      },
      z.array(z.string().min(1)).min(1),
    ),
    // Wrap confidenceNotes if Gemini sends a plain string
    confidenceNotes: z.preprocess(
      (val) => {
        if (typeof val === "string") return [val];
        if (Array.isArray(val)) return val;
        return ["No confidence notes provided."]; // Fallback
      },
      z.array(z.string().min(1)).min(1),
    ),
    // Forgiving Enum matching for the label
    confidenceLabel: z.preprocess(
      (val) => {
        if (typeof val !== "string") return "Needs verification"; // Safe default

        const normalized = val.trim().toLowerCase();

        if (normalized.includes("high")) return "High signal";
        if (normalized.includes("moderate") || normalized.includes("medium"))
          return "Moderate signal";

        // If it says "need", "low", or invents a totally new word, default to the safest option
        return "Needs verification";
      },
      z.enum(["High signal", "Moderate signal", "Needs verification"]),
    ),
  })
  .strict();

export const searchResponseSchema = z
  .object({
    query: z.string().min(1),
    expandedQuery: z.string().nullable(),
    overallFindingsSummary: z.string().nullable().optional().default(null),
    sources: z.array(researchSourceSchema),
    fromCache: z.boolean(),
    warnings: z.array(z.string()),
  })
  .strict();

export const queryExpansionSchema = z
  .object({
    expandedQuery: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

export const overallFindingsSummarySchema = z
  .object({
    overallFindingsSummary: z.string().min(1),
  })
  .strict();

export const sourceInsightsSchema = z.array(
  z
    .object({
      sourceId: z.string().min(1),
      summary: z.string().min(1),
      keyFinding: z.string().min(1),
      methodologyNote: z.string().min(1),
    })
    .strict(),
);

export const methodologyNotesSchema = z.array(
  z
    .object({
      sourceId: z.string().min(1),
      methodologyNote: z.string().min(1),
    })
    .strict(),
);
