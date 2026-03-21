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
export const searchModeSchema = z.enum(["all", "local"]);

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
    publicationCountryCode: z.string().nullable(),
    sourceProvider: sourceProviderSchema,
    paperId: z.string().nullable(),
    openAlexId: z.string().nullable(),
    localityLabel: localityLabelSchema,
    localReason: z.string().min(1),
    retractionStatus: retractionStatusSchema,
    predatoryStatus: predatoryStatusSchema,
    predatoryMatchReasons: z.array(z.string()),
    missingFields: z.array(z.string()),
    credibility: credibilitySummarySchema,
  })
  .strict();

export const conflictEntrySchema = z.object({
  // Gemini may send "topic" or "description" — coerce into claim
  claim: z.preprocess((val, ctx) => {
    if (typeof val === "string" && val.length > 0) return val;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "claim is required",
    });
    return z.NEVER;
  }, z.string().min(1)),

  // Gemini sometimes omits these or sends null — always coerce to array
  supportingSourceIds: z.preprocess(
    (val) => (Array.isArray(val) ? val : []),
    z.array(z.string()),
  ),
  opposingSourceIds: z.preprocess(
    (val) => (Array.isArray(val) ? val : []),
    z.array(z.string()),
  ),

  // Forgiving enum — normalise whatever label Gemini invents
  consensusLabel: z.preprocess(
    (val) => {
      if (typeof val !== "string") return "Emerging debate";

      const n = val.trim().toLowerCase();

      if (
        n.includes("split") ||
        n.includes("conflict") ||
        n.includes("divided")
      )
        return "Split evidence";
      if (
        n.includes("context") ||
        n.includes("conditional") ||
        n.includes("depend")
      )
        return "Context-sensitive";

      return "Emerging debate";
    },
    z.enum(["Emerging debate", "Split evidence", "Context-sensitive"]),
  ),
});

export const geminiAnalysisPayloadSchema = z
  .object({
    synthesis: z.string().min(1),

    // Gemini collapses conflicts to a prose string when it finds nothing
    conflicts: z.preprocess((val) => {
      if (typeof val === "string") return [];
      if (Array.isArray(val)) return val;
      return [];
    }, z.array(conflictEntrySchema)),

    // Gemini sometimes sends a plain string instead of a single-element array
    researchGaps: z.preprocess(
      (val) => {
        if (typeof val === "string") return [val];
        if (Array.isArray(val)) return val;
        return ["No specific gaps identified."];
      },
      z.array(z.string().min(1)).min(1),
    ),

    // Next search if the user wants to validate the gap
    validateGapSearch: z.preprocess(
      (val) => {
        if (typeof val === "string") return [val];
        if (Array.isArray(val)) return val;
        return ["No validation search generated."];
      },
      z.array(z.string().min(1)),
    ),

    // Same pattern as researchGaps
    confidenceNotes: z.preprocess(
      (val) => {
        if (typeof val === "string") return [val];
        if (Array.isArray(val)) return val;
        return ["No confidence notes provided."];
      },
      z.array(z.string().min(1)).min(1),
    ),

    // Forgiving enum matching
    confidenceLabel: z.preprocess(
      (val) => {
        if (typeof val !== "string") return "Needs verification";

        const normalized = val.trim().toLowerCase();

        if (normalized.includes("high")) return "High signal";
        if (normalized.includes("moderate") || normalized.includes("medium"))
          return "Moderate signal";

        return "Needs verification";
      },
      z.enum(["High signal", "Moderate signal", "Needs verification"]),
    ),
  })
  .strict();

export const analysisResultSchema = z
  .object({
    synthesis: z.string().min(1),
    conflicts: z.array(conflictEntrySchema),
    researchGaps: z.array(z.string().min(1)),
    validateGapSearch: z.array(z.string()),
    confidenceNotes: z.array(z.string().min(1)),
    citations: z.array(z.string().min(1)),
    confidenceLabel: confidenceLabelSchema,
    model: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    generatedFromSourceIds: z.array(z.string().min(1)),
  })
  .strict();

export const workplaceSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    query: z.string().min(1),
    selectedSourceIds: z.array(z.string().min(1)),
    analysis: analysisResultSchema,
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const searchResponseSchema = z
  .object({
    query: z.string().min(1),
    searchMode: searchModeSchema.optional().default("all"),
    expandedQuery: z.string().nullable(),
    overallFindingsSummary: z.string().nullable().optional().default(null),
    sources: z.array(researchSourceSchema),
    fromCache: z.boolean(),
    warnings: z.array(z.string()),
  })
  .strict();

export const queryExpansionSchema = z.object({
  expandedQuery: z.string().min(1),
  rationale: z.string().min(1),
});

export const overallFindingsSummarySchema = z.object({
  overallFindingsSummary: z.string().min(1),
});

export const sourceInsightsSchema = z.array(
  z.object({
    sourceId: z.string().min(1),
    summary: z.string().min(1),
    keyFinding: z.string().min(1),
    methodologyNote: z.string().min(1),
  }),
);

export const methodologyNotesSchema = z.array(
  z.object({
    sourceId: z.string().min(1),
    methodologyNote: z.string().min(1),
  }),
);

export const gapEvaluationSchema = z
  .object({
    gapAddressed: z.boolean(),
    explanation: z.string().min(1),
    resolvingSourceIds: z.array(z.string()),
  })
  .strict();

export const localityReviewSchema = z.array(
  z
    .object({
      sourceId: z.string().min(1),
      localityLabel: localityLabelSchema,
      localReason: z.preprocess((val) => {
        if (typeof val !== "string") {
          return "Metadata-only locality review did not provide a reason.";
        }

        const normalized = val.trim();
        return normalized.length > 0
          ? normalized
          : "Metadata-only locality review did not provide a reason.";
      }, z.string().min(1)),
    })
    .strict(),
);
