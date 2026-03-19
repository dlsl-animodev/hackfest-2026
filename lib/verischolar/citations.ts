import type { DashboardMetrics, ResearchSource } from "@/lib/verischolar/types";

function formatAuthors(authors: string[]) {
  if (authors.length === 0) {
    return "Unknown author";
  }

  return authors
    .slice(0, 4)
    .map((author) => {
      const parts = author.trim().split(/\s+/);
      const lastName = parts.pop() ?? author;
      const initials = parts.map((part) => `${part.charAt(0)}.`).join(" ");
      return initials ? `${lastName}, ${initials}` : lastName;
    })
    .join(authors.length > 1 ? ", " : "");
}

export function buildApaCitation(source: ResearchSource) {
  const authorBlock = formatAuthors(source.authors);
  const yearBlock = source.year ?? "n.d.";
  const venueBlock = source.journal ?? source.publisher ?? "[Venue unknown]";
  const doiBlock = source.doi ? ` https://doi.org/${source.doi}` : "";

  return `${authorBlock} (${yearBlock}). ${source.title}. ${venueBlock}.${doiBlock}`.trim();
}

export function buildCitationExport(sources: ResearchSource[]) {
  return sources.map(buildApaCitation).join("\n");
}

export function getDashboardMetrics(sources: ResearchSource[]): DashboardMetrics {
  if (sources.length === 0) {
    return {
      sourceCount: 0,
      localCount: 0,
      foreignCount: 0,
      flaggedCount: 0,
      retractedCount: 0,
      predatoryCount: 0,
      oldSourceCount: 0,
      unknownMetadataCount: 0,
      averageCitationCount: 0,
      averageYear: 0,
      ratioLocal: 0,
      trustedCount: 0,
    };
  }

  const datedSources = sources.filter((source) => source.year !== null);
  const citedSources = sources.filter((source) => source.citationCount !== null);
  const totalYear = datedSources.reduce((sum, source) => sum + (source.year ?? 0), 0);
  const totalCitations = citedSources.reduce(
    (sum, source) => sum + (source.citationCount ?? 0),
    0,
  );
  const localCount = sources.filter(
    (source) => source.localityLabel === "Local",
  ).length;
  const foreignCount = sources.filter(
    (source) => source.localityLabel === "Foreign",
  ).length;
  const flaggedCount = sources.filter(
    (source) =>
      source.credibility.label === "Risk" ||
      source.credibility.predatory ||
      source.credibility.retracted,
  ).length;
  const retractedCount = sources.filter(
    (source) => source.retractionStatus === "Retracted",
  ).length;
  const predatoryCount = sources.filter(
    (source) => source.predatoryStatus === "Predatory",
  ).length;
  const oldSourceCount = sources.filter(
    (source) =>
      source.year !== null && new Date().getFullYear() - source.year > 10,
  ).length;
  const unknownMetadataCount = sources.filter(
    (source) => source.missingFields.length > 0,
  ).length;
  const trustedCount = sources.filter(
    (source) => source.credibility.label === "Trusted",
  ).length;

  return {
    sourceCount: sources.length,
    localCount,
    foreignCount,
    flaggedCount,
    retractedCount,
    predatoryCount,
    oldSourceCount,
    unknownMetadataCount,
    averageCitationCount:
      citedSources.length > 0 ? Math.round(totalCitations / citedSources.length) : 0,
    averageYear:
      datedSources.length > 0 ? Number((totalYear / datedSources.length).toFixed(1)) : 0,
    ratioLocal: Number(((localCount / sources.length) * 100).toFixed(1)),
    trustedCount,
  };
}
