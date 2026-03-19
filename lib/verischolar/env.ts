import "server-only";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getGeminiConfig() {
  const apiKey = readEnv("GEMINI_API_KEY");

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash",
  };
}

export function getSupabaseConfig() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const secretKey = readEnv("SUPABASE_SECRET_KEY");

  if (!url || !secretKey) {
    return null;
  }

  return {
    url,
    publishableKey,
    secretKey,
  };
}

export function getSemanticScholarApiKey() {
  return readEnv("SEMANTIC_SCHOLAR_API_KEY");
}

export function getOpenAlexMailto() {
  return readEnv("OPENALEX_MAILTO");
}

export function getCrossrefMailto() {
  return readEnv("CROSSREF_MAILTO");
}
