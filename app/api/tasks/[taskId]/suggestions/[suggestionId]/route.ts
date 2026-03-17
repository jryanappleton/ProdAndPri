import { NextRequest } from "next/server";
import { applySuggestion, ignoreSuggestion } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; suggestionId: string }> }
) {
  try {
    const { taskId, suggestionId } = await context.params;
    const body = (await request.json()) as {
      action: "accept" | "ignore";
    };

    if (body.action === "accept") {
      const task = await applySuggestion(taskId, suggestionId);
      return dataJson({ task });
    } else {
      const task = await ignoreSuggestion(taskId, suggestionId);
      return dataJson({ task });
    }
  } catch (error) {
    return errorJson(error);
  }
}
