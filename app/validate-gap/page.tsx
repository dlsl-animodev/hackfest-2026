'use client'

import { useAnalysisStateStore } from "@/store/useAnalysisStateStore"
import { getSearchResponse } from "@/lib/verischolar/data";
import { SearchResponse } from "@/lib/verischolar/types";

import { useState, useEffect } from "react";

export default function ValidateGapPage() {
    // Global store for handling the result of the run contradiction aware synthesis 
    const analysisState = useAnalysisStateStore((state) => state.analysisState);

    const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
    useEffect(() => {
        async function fetchData() {
            const response = await getSearchResponse("");
            setSearchResponse(response);
        }
        fetchData();
    }, [])

    return (
        <div>
            validate gap
            <pre>
                {JSON.stringify(analysisState, null, 2)}
            </pre>
            <pre>
                {JSON.stringify(searchResponse, null, 2)}
            </pre>
        </div>
    )
}