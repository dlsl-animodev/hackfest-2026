// @/components/validate-gap/validate-gap-board.tsx
"use client";

import { useState } from "react";
import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";
import { runAgentStep, type AgentStepResult } from "@/actions/validate-gap/actions";

type AgentLog = {
    query: string;
    status: "searching" | "failed" | "success";
    stepResult?: AgentStepResult;
};

export default function ValidateGapBoard() {
    // Pull the analysis state from Zustand
    const analysisState = useAnalysisStateStore((state) => state.analysisState);

    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [finalWinner, setFinalWinner] = useState<AgentStepResult | null>(null);

    async function startAgent() {
        if (!analysisState?.analysis) return;

        setIsAgentRunning(true);
        setLogs([]);
        setFinalWinner(null);

        const queries = analysisState.analysis.validateGapSearch;
        const targetGaps = analysisState.analysis.researchGaps;

        // The Iterative Agent Loop
        for (const query of queries) {
            // Update UI: Show we are searching
            setLogs((prev) => [...prev, { query, status: "searching" }]);

            try {
                // Call the Server Action (Semantic Scholar -> Gemini)
                const stepResult = await runAgentStep(query, targetGaps);

                if (stepResult.evaluation.gapAddressed) {
                    // 🎉 Gap Addressed! Update log, set winner, and break the loop.
                    setLogs((prev) =>
                        prev.map((log) =>
                            log.query === query ? { ...log, status: "success", stepResult } : log
                        )
                    );
                    setFinalWinner(stepResult);
                    break; 
                } else {
                    // ❌ Not addressed. Mark failed, loop continues to the next query.
                    setLogs((prev) =>
                        prev.map((log) =>
                            log.query === query ? { ...log, status: "failed", stepResult } : log
                        )
                    );
                }
            } catch (error) {
                setLogs((prev) =>
                    prev.map((log) =>
                        log.query === query ? { ...log, status: "failed" } : log
                    )
                );
            }
        }

        setIsAgentRunning(false);
    }

    if (!analysisState?.analysis) {
        return <div className="p-10 text-center">No analysis state found. Please run an initial search first.</div>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8 py-10">
            <div className="rounded-xl border bg-gray-50 p-6">
                <h1 className="text-2xl font-bold text-gray-900">Validate Research Gaps</h1>
                <p className="mt-2 text-sm text-gray-600">
                    We identified <strong>{analysisState.analysis.validateGapSearch.length}</strong> targeted queries to check if these gaps are truly unaddressed in the literature.
                </p>
                <ul className="mt-4 list-disc pl-5 text-sm text-gray-700">
                    {analysisState.analysis.researchGaps.map((gap: string, i: number) => (
                        <li key={i}>{gap}</li>
                    ))}
                </ul>
                <button
                    onClick={startAgent}
                    disabled={isAgentRunning}
                    className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                    {isAgentRunning ? "Agent is running..." : "Start Agentic Search"}
                </button>
            </div>

            {/* Agent Logs */}
            <div className="space-y-4">
                {logs.map((log, idx) => (
                    <div key={idx} className={`rounded-xl border p-5 ${log.status === "searching" ? "animate-pulse bg-blue-50/50" : "bg-white"}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-mono text-sm font-medium text-gray-800">Query: {log.query}</h3>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                {log.status}
                            </span>
                        </div>
                        {log.stepResult?.evaluation.explanation && (
                            <p className="mt-3 text-sm leading-relaxed text-gray-600">
                                <span className="font-semibold text-gray-900">AI Note:</span> {log.stepResult.evaluation.explanation}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Final Outcome */}
            {finalWinner && (
                <div className="rounded-xl border-2 border-green-500 bg-green-50 p-6">
                    <h2 className="text-xl font-bold text-green-800">Gap Successfully Addressed!</h2>
                    <p className="mt-2 text-sm text-green-700">
                        The agent found literature that resolves the identified gaps using the query: <strong>"{finalWinner.queryUsed}"</strong>.
                    </p>
                    {/* You can map over finalWinner.searchResponse.sources here to show the actual papers */}
                </div>
            )}

            {!isAgentRunning && logs.length > 0 && !finalWinner && (
                <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-6">
                    <h2 className="text-xl font-bold text-orange-800">Gaps Confirmed</h2>
                    <p className="mt-2 text-sm text-orange-700">
                        The agent exhausted all validation queries. Based on Semantic Scholar and OpenAlex data, these research gaps are genuinely unaddressed in the current literature.
                    </p>
                </div>
            )}
        </div>
    );
}