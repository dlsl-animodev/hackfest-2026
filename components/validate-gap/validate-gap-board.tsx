"use client";

import { useState, useEffect } from "react";
import { useAnalysisStateStore } from "@/store/useAnalysisStateStore";
import {
    runAgentStep,
    getNextIterationGaps,
    type AgentStepResult,
} from "@/actions/validate-gap/actions";
import Button from "../reusables/button";
import { Search } from "lucide-react";
import Badge from "../reusables/badge";
import { Card } from "../reusables/card";
import { TopBar } from "../verischolar/top-bar";

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
            setIterations([
                {
                    id: 1,
                    gaps: analysisState.analysis.researchGaps,
                    queries: analysisState.analysis.validateGapSearch,
                    logs: [],
                    winner: null,
                    exhausted: false,
                },
            ]);
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
                next[currentIdx] = {
                    ...next[currentIdx],
                    logs: [
                        ...next[currentIdx].logs,
                        { query, status: "searching" },
                    ],
                };
                return next;
            });

            try {
                const stepResult = await runAgentStep(query, currentIter.gaps);

                if (stepResult.evaluation.gapAddressed) {
                    // Update log to success and set winner
                    setIterations((prev) => {
                        const next = [...prev];
                        const updatedLogs = [...next[currentIdx].logs];
                        updatedLogs[updatedLogs.length - 1] = {
                            query,
                            status: "success",
                            stepResult,
                        };
                        next[currentIdx] = {
                            ...next[currentIdx],
                            logs: updatedLogs,
                            winner: stepResult,
                        };
                        return next;
                    });
                    foundWinner = true;
                    break; // Gap solved, stop searching for this iteration
                } else {
                    // Update log to failed
                    setIterations((prev) => {
                        const next = [...prev];
                        const updatedLogs = [...next[currentIdx].logs];
                        updatedLogs[updatedLogs.length - 1] = {
                            query,
                            status: "failed",
                            stepResult,
                        };
                        next[currentIdx] = {
                            ...next[currentIdx],
                            logs: updatedLogs,
                        };
                        return next;
                    });
                }
            } catch (error) {
                console.error("Agent step failed for query:", query, error);
                setIterations((prev) => {
                    const next = [...prev];
                    const updatedLogs = [...next[currentIdx].logs];
                    updatedLogs[updatedLogs.length - 1] = {
                        query,
                        status: "failed",
                    };
                    next[currentIdx] = {
                        ...next[currentIdx],
                        logs: updatedLogs,
                    };
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
            const nextData = await getNextIterationGaps(
                iteration.winner.queryUsed,
                iteration.winner.searchResponse.sources,
            );

            // Append a BRAND NEW iteration to the feed, keeping the old ones above it
            setIterations((prev) => [
                ...prev,
                {
                    id: prev.length + 1,
                    gaps: nextData.researchGaps,
                    queries: nextData.validateGapSearch,
                    logs: [],
                    winner: null,
                    exhausted: false,
                },
            ]);
        } catch (error) {
            console.error("Failed to analyze new gaps", error);
        } finally {
            setIsAnalyzingNewGaps(false);
        }
    }

    if (!analysisState?.analysis) {
        return (
            <div className="p-10 text-center">
                No analysis state found. Please run an initial search first.
            </div>
        );
    }

    return (
        <div>
            <TopBar />

            <div className="mx-auto max-w-3xl space-y-12 py-10">
                {iterations.map((iteration, index) => {
                    const isLatest = index === iterations.length - 1;
                    const hasStarted = iteration.logs.length > 0;

                    // Safely extract the resolving papers for this specific iteration
                    const resolvedSources = iteration.winner
                        ? iteration.winner.searchResponse.sources.filter((s) =>
                              iteration.winner!.evaluation.resolvingSourceIds.includes(
                                  s.id,
                              ),
                          )
                        : [];
                    const sourcesToDisplay =
                        resolvedSources.length > 0
                            ? resolvedSources
                            : iteration.winner?.searchResponse.sources.slice(
                                  0,
                                  3,
                              ) || [];

                    return (
                        <div
                            key={iteration.id}
                            className="space-y-8 border-b-2 border-dashed border-gray-200 pb-12 last:border-0"
                        >
                            <Card className="flex flex-col gap-4">
                                <section>
                                    <div className="flex items-center justify-between">
                                        <h1 className="text-2xl  text-gray-900 type-display">
                                            Validate Research Gaps
                                        </h1>
                                        <Badge>Iteration {iteration.id}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Targeting{" "}
                                        <strong>
                                            {iteration.queries.length}
                                        </strong>{" "}
                                        queries to check if these gaps are
                                        unaddressed in the literature.
                                    </p>
                                </section>

                                <ul className="list-disc pl-5 text-sm text-gray-700">
                                    {iteration.gaps.map(
                                        (gap: string, i: number) => (
                                            <li key={i}>{gap}</li>
                                        ),
                                    )}
                                </ul>

                                {/* Only show the Start button if it's the latest iteration and hasn't run yet */}
                                {isLatest && !hasStarted && (
                                    <Button
                                        onClick={startAgent}
                                        disabled={
                                            isAgentRunning || isAnalyzingNewGaps
                                        }
                                        className="w-fit"
                                    >
                                        <Search />
                                        {isAgentRunning
                                            ? "Agent is running..."
                                            : "Start Validation Search"}
                                    </Button>
                                )}
                            </Card>

                            {iteration.logs.length > 0 && (
                                <div className="space-y-4">
                                    {iteration.logs.map((log, idx) => (
                                        <Card
                                            key={idx}
                                            className={`flex flex-col gap-3 ${log.status === "searching" ? "animate-pulse" : ""}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="type-display text-sm font-medium text-gray-800">
                                                    Query: {log.query}
                                                </h3>
                                            </div>
                                            {log.stepResult?.evaluation
                                                .explanation && (
                                                <p className="text-sm leading-relaxed text-gray-600">
                                                    <span className="font-semibold text-gray-900">
                                                        AI Note:
                                                    </span>{" "}
                                                    {
                                                        log.stepResult
                                                            .evaluation
                                                            .explanation
                                                    }
                                                </p>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {iteration.winner && (
                                <Card className="flex flex-col gap-4">
                                    <section>
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Gap Addressed!
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-700">
                                            The agent found literature resolving
                                            these gaps using the query:{" "}
                                            <strong>
                                                &quot;
                                                {iteration.winner.queryUsed}
                                                &quot;
                                            </strong>
                                            .
                                        </p>
                                    </section>

                                    <Card className="flex flex-col gap-3">
                                        <h3 className="text-sm font-bold text-gray-800">
                                            Key Resolving Sources:
                                        </h3>
                                        <ul className="space-y-3">
                                            {sourcesToDisplay.map((s) => (
                                                <li
                                                    key={s.id}
                                                    className="text-sm"
                                                >
                                                    <span className="font-semibold text-gray-900">
                                                        {s.title}
                                                    </span>{" "}
                                                    {s.year && (
                                                        <span className="text-gray-500">
                                                            ({s.year})
                                                        </span>
                                                    )}
                                                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                                        {s.abstract}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>

                                    {/* Only allow digging deeper if this is the bottom-most (latest) block */}
                                    {isLatest && (
                                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                                            <p className="text-sm font-medium text-gray-800">
                                                Dig deeper into these papers to
                                                find the *next* layer of gaps?
                                            </p>
                                            <Button
                                                onClick={() =>
                                                    handleAnalyzeNewGaps(index)
                                                }
                                                disabled={isAnalyzingNewGaps}
                                                className="w-fit"
                                            >
                                                {isAnalyzingNewGaps
                                                    ? "Analyzing Papers..."
                                                    : "Identify Next-Level Gaps"}
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {iteration.exhausted && (
                                <Card className="flex flex-col gap-4">
                                    <h2 className="text-xl type-display text-gray-900">
                                        Bedrock Reached: Gaps Confirmed
                                    </h2>
                                    <p className="text-sm text-gray-700">
                                        The agent exhausted all validation
                                        queries. Based on provider data, these
                                        research gaps are genuinely unaddressed
                                        in current literature. You have found a
                                        solid research opportunity.
                                    </p>
                                </Card>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
