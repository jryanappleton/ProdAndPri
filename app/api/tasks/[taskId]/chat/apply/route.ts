import { NextRequest } from "next/server";
import { applyTaskChatDraft } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      action: "next_action" | "description" | "note" | "subtask" | "tag";
      itemId?: string;
    };
    const result = await applyTaskChatDraft(taskId, body.action, body.itemId);
    return dataJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
