"use client";

import { useState, useEffect } from "react";
import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";
import { runAgentStep, getNextIterationGaps, type AgentStepResult } from "@/actions/validate-gap/actions";

type AgentLog = {
    query: string;
    status: "searching" | "failed" | "success";
    stepResult?: AgentStepResult;
};

// We group all data by "Iteration" so previous runs stay on the screen
type IterationBlock = {
    id: number;
    gaps: string[];
    queries: string[];
    logs: AgentLog[];
    winner: AgentStepResult | null;
    exhausted: boolean;
};

export default function ValidateGapBoard() {
    const analysisState = useAnalysisStateStore((state) => state.analysisState);

    // Our new historical feed state
    const [iterations, setIterations] = useState<IterationBlock[]>([]);
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [isAnalyzingNewGaps, setIsAnalyzingNewGaps] = useState(false);

    // Initialize the very first iteration on load
    useEffect(() => {
        if (analysisState?.analysis && iterations.length === 0) {
            setIterations([{
                id: 1,
                gaps: analysisState.analysis.researchGaps,
                queries: analysisState.analysis.validateGapSearch,
                logs: [],
                winner: null,
                exhausted: false
            }]);
        }
    }, [analysisState, iterations.length]);

    async function startAgent() {
        if (iterations.length === 0) return;

        setIsAgentRunning(true);
        const currentIdx = iterations.length - 1;
        const currentIter = iterations[currentIdx];
        
        let foundWinner = false;

        for (const query of currentIter.queries) {
            // Append "searching" log safely to the current iteration
            setIterations((prev) => {
                const next = [...prev];
                next[currentIdx] = { ...next[currentIdx], logs: [...next[currentIdx].logs, { query, status: "searching" }] };
                return next;
            });

            try {
                const stepResult = await runAgentStep(query, currentIter.gaps);

                if (stepResult.evaluation.gapAddressed) {
                    // Update log to success and set winner
                    setIterations((prev) => {
                        const next = [...prev];
                        const updatedLogs = [...next[currentIdx].logs];
                        updatedLogs[updatedLogs.length - 1] = { query, status: "success", stepResult };
                        next[currentIdx] = { ...next[currentIdx], logs: updatedLogs, winner: stepResult };
                        return next;
                    });
                    foundWinner = true;
                    break; // Gap solved, stop searching for this iteration
                } else {
                    // Update log to failed
                    setIterations((prev) => {
                        const next = [...prev];
                        const updatedLogs = [...next[currentIdx].logs];
                        updatedLogs[updatedLogs.length - 1] = { query, status: "failed", stepResult };
                        next[currentIdx] = { ...next[currentIdx], logs: updatedLogs };
                        return next;
                    });
                }
            } catch (error) {
                console.error("Agent step failed for query:", query, error);
                setIterations((prev) => {
                    const next = [...prev];
                    const updatedLogs = [...next[currentIdx].logs];
                    updatedLogs[updatedLogs.length - 1] = { query, status: "failed" };
                    next[currentIdx] = { ...next[currentIdx], logs: updatedLogs };
                    return next;
                });
            }
        }

        if (!foundWinner) {
            // Mark this specific iteration as exhausted
            setIterations((prev) => {
                const next = [...prev];
                next[currentIdx] = { ...next[currentIdx], exhausted: true };
                return next;
            });
        }

        setIsAgentRunning(false);
    }

    async function handleAnalyzeNewGaps(iterationIndex: number) {
        const iteration = iterations[iterationIndex];
        if (!iteration.winner) return;

        setIsAnalyzingNewGaps(true);

        try {
            const nextData = await getNextIterationGaps(iteration.winner.queryUsed, iteration.winner.searchResponse.sources);

            // Append a BRAND NEW iteration to the feed, keeping the old ones above it
            setIterations((prev) => [
                ...prev,
                {
                    id: prev.length + 1,
                    gaps: nextData.researchGaps,
                    queries: nextData.validateGapSearch,
                    logs: [],
                    winner: null,
                    exhausted: false
                }
            ]);
        } catch (error) {
            console.error("Failed to analyze new gaps", error);
        } finally {
            setIsAnalyzingNewGaps(false);
        }
    }

    if (!analysisState?.analysis) {
        return <div className="p-10 text-center">No analysis state found. Please run an initial search first.</div>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-12 py-10">
            {iterations.map((iteration, index) => {
                const isLatest = index === iterations.length - 1;
                const hasStarted = iteration.logs.length > 0;

                // Safely extract the resolving papers for this specific iteration
                const resolvedSources = iteration.winner 
                    ? iteration.winner.searchResponse.sources.filter(s => iteration.winner!.evaluation.resolvingSourceIds.includes(s.id))
                    : [];
                const sourcesToDisplay = resolvedSources.length > 0 ? resolvedSources : iteration.winner?.searchResponse.sources.slice(0, 3) || [];

                return (
                    <div key={iteration.id} className="space-y-8 border-b-2 border-dashed border-gray-200 pb-12 last:border-0">
                        
                        {/* 1. Header Block */}
                        <div className="rounded-xl border bg-gray-50 p-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold text-gray-900">Validate Research Gaps</h1>
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">Iteration {iteration.id}</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                                Targeting <strong>{iteration.queries.length}</strong> queries to check if these gaps are unaddressed in the literature.
                            </p>
                            <ul className="mt-4 list-disc pl-5 text-sm text-gray-700">
                                {iteration.gaps.map((gap: string, i: number) => <li key={i}>{gap}</li>)}
                            </ul>
                            
                            {/* Only show the Start button if it's the latest iteration and hasn't run yet */}
                            {isLatest && !hasStarted && (
                                <button
                                    onClick={startAgent}
                                    disabled={isAgentRunning || isAnalyzingNewGaps}
                                    className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isAgentRunning ? "Agent is running..." : "Start Validation Search"}
                                </button>
                            )}
                        </div>

                        {/* 2. Agent Logs */}
                        {iteration.logs.length > 0 && (
                            <div className="space-y-4">
                                {iteration.logs.map((log, idx) => (
                                    <div key={idx} className={`rounded-xl border p-5 ${log.status === "searching" ? "animate-pulse bg-blue-50/50" : "bg-white"}`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-mono text-sm font-medium text-gray-800">Query: {log.query}</h3>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${log.status === 'success' ? 'text-green-600' : log.status === 'failed' ? 'text-red-500' : 'text-gray-500'}`}>
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
                        )}

                        {/* 3. Success State */}
                        {iteration.winner && (
                            <div className="rounded-xl border-2 border-green-500 bg-green-50 p-6 space-y-4 shadow-sm">
                                <h2 className="text-xl font-bold text-green-800">Gap Addressed!</h2>
                                <p className="text-sm text-green-700">
                                    The agent found literature resolving these gaps using the query: <strong>&quot;{iteration.winner.queryUsed}&quot;</strong>.
                                </p>

                                <div className="rounded-lg border border-green-200 bg-white p-4">
                                    <h3 className="mb-2 text-sm font-bold text-gray-800">Key Resolving Sources:</h3>
                                    <ul className="space-y-3">
                                        {sourcesToDisplay.map(s => (
                                            <li key={s.id} className="text-sm">
                                                <span className="font-semibold text-gray-900">{s.title}</span> {s.year && <span className="text-gray-500">({s.year})</span>}
                                                <p className="mt-1 line-clamp-2 text-xs text-gray-600">{s.abstract}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Only allow digging deeper if this is the bottom-most (latest) block */}
                                {isLatest && (
                                    <div className="mt-4 flex items-center justify-between border-t border-green-200 pt-4">
                                        <p className="text-sm font-medium text-gray-800">Dig deeper into these papers to find the *next* layer of gaps?</p>
                                        <button
                                            onClick={() => handleAnalyzeNewGaps(index)}
                                            disabled={isAnalyzingNewGaps}
                                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isAnalyzingNewGaps ? "Analyzing Papers..." : "Identify Next-Level Gaps"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Failure State */}
                        {iteration.exhausted && (
                            <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-6 space-y-4 shadow-sm">
                                <h2 className="text-xl font-bold text-orange-800">Bedrock Reached: Gaps Confirmed</h2>
                                <p className="text-sm text-orange-700">
                                    The agent exhausted all validation queries. Based on provider data, these research gaps are genuinely unaddressed in current literature. You have found a solid research opportunity.
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}