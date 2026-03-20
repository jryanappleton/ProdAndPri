import { NextRequest } from "next/server";
import { applyTaskAnalysisSuggestion } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      action: "task_next_action" | "next_step" | "suggested_note" | "improved_task";
      itemId?: string;
    };

    const task = await applyTaskAnalysisSuggestion({
      taskId,
      action: body.action,
      itemId: body.itemId
    });

    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
