import { NextRequest } from "next/server";
import { resetTaskChat } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const chat = await resetTaskChat(taskId);
    return dataJson({ chat });
  } catch (error) {
    return errorJson(error);
  }
}
