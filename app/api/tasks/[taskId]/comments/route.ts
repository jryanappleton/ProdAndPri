import { NextRequest } from "next/server";
import { addComment } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      body: string;
    };
    const task = await addComment(taskId, body.body);
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
