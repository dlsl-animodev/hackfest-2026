"use server";

import { randomUUID } from "node:crypto";

import { analyzeResearchBoard } from "@/lib/verischolar/analysis";
import type { AnalysisActionState } from "@/lib/verischolar/action-state";
import { getSelectedSources } from "@/lib/verischolar/data";
import { writeWorkplaceSession } from "@/lib/verischolar/supabase";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function analyzeBoardAction(
  _previousState: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const query = getStringValue(formData.get("query"));
  const selectedIds = formData
    .getAll("sourceId")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (!query) {
    return {
      status: "error",
      message: "Add a research question before running synthesis.",
      analysis: null,
      selectedSourceIds: [],
      workplaceSessionId: null,
    };
  }

  if (selectedIds.length < 3) {
    return {
      status: "error",
      message: "Select at least three sources to generate a reliable synthesis.",
      analysis: null,
      selectedSourceIds: selectedIds,
      workplaceSessionId: null,
    };
  }

  const selectedSources = await getSelectedSources(query, selectedIds);

  if (selectedSources.length < 3) {
    return {
      status: "error",
      message:
        "Some selected sources could not be revalidated on the server. Try again.",
      analysis: null,
      selectedSourceIds: selectedIds,
      workplaceSessionId: null,
    };
  }

  try {
    const analysis = await analyzeResearchBoard(query, selectedSources);
    const workplaceSessionId = randomUUID();

    await writeWorkplaceSession({
      sessionId: workplaceSessionId,
      query,
      selectedSourceIds: selectedSources.map((source) => source.id),
      analysis,
    });

    return {
      status: "success",
      message: "Synthesis session created in Workplace.",
      analysis,
      selectedSourceIds: selectedSources.map((source) => source.id),
      workplaceSessionId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gemini analysis failed. Please try again after checking live configuration.";

    return {
      status: "error",
      message,
      analysis: null,
      selectedSourceIds: selectedSources.map((source) => source.id),
      workplaceSessionId: null,
    };
  }
}
