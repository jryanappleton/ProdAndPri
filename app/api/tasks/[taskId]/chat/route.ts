import { NextRequest } from "next/server";
import { getTaskChatSnapshot, sendTaskChatMessage } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const chat = await getTaskChatSnapshot(taskId);
    return dataJson({ chat });
  } catch (error) {
    return errorJson(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      body: string;
    };
    const chat = await sendTaskChatMessage(taskId, body.body);
    return dataJson({ chat });
  } catch (error) {
    return errorJson(error);
  }
}
