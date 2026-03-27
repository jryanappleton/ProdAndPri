import { NextRequest } from "next/server";
import { dismissTaskChatDraft } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const chat = await dismissTaskChatDraft(taskId);
    return dataJson({ chat });
  } catch (error) {
    return errorJson(error);
  }
}
