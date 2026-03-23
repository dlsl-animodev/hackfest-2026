import ValidateGapBoard from "@/components/validate-gap/validate-gap-board";
import { readWorkplaceSession } from "@/lib/verischolar/supabase";

type ValidateGapPageProps = {
  searchParams: Promise<{
    sessionId?: string | string[];
  }>;
};

function getSessionIdValue(rawValue?: string | string[]) {
  if (Array.isArray(rawValue)) {
    return rawValue[0]?.trim() ?? "";
  }

  return rawValue?.trim() ?? "";
}

export default async function ValidateGapPage({
  searchParams,
}: ValidateGapPageProps) {
  const params = await searchParams;
  const sessionId = getSessionIdValue(params.sessionId);
  const session = sessionId ? await readWorkplaceSession(sessionId) : null;

  return <ValidateGapBoard initialAnalysis={session?.analysis ?? null} />;
}
