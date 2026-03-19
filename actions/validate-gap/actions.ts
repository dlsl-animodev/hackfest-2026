"use server";

import { getSearchResponse } from "@/lib/verischolar/data";
import { evaluateIfGapAddressed } from "@/lib/verischolar/gemini";
import type { SearchResponse } from "@/lib/verischolar/types";

export type AgentStepResult = {
    queryUsed: string;
    searchResponse: SearchResponse;
    evaluation: {
        gapAddressed: boolean;
        explanation: string;
        resolvingSourceIds: string[];
    };
};

export async function runAgentStep(
    query: string,
    targetGaps: string[],
): Promise<AgentStepResult> {
    // it Semantic Scholar & OpenAlex via your existing logic
    const searchResponse = await getSearchResponse(query);

    // Pass the retrieved sources to Gemini to judge against the gaps
    const evaluation = await evaluateIfGapAddressed(
        targetGaps,
        searchResponse.sources,
    );

    // Return the complete package to the client
    return {
        queryUsed: query,
        searchResponse,
        evaluation,
    };
}
