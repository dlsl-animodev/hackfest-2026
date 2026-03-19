"use client";

import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";
import { SearchResponse } from "@/lib/verischolar/types";

interface ValidateGapBoardProps {
    initialSearchResponse: SearchResponse | null;
}

export default function ValidateGapBoard({
    initialSearchResponse,
}: ValidateGapBoardProps) {
    const analysisState = useAnalysisStateStore((state) => state.analysisState);

    return (
        <div>
            <pre className="border-b pb-4 mb-4">{JSON.stringify(initialSearchResponse, null, 2)}</pre>
            <pre>{JSON.stringify(analysisState, null, 2)}</pre>
        </div>
    );
}
