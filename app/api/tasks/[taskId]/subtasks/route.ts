import { NextRequest } from "next/server";
import { createSubtask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      title: string;
    };
    const task = await createSubtask(taskId, body.title);
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
