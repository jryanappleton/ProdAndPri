import { NextRequest } from "next/server";
import { classifyTask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      taskId: string;
    }>;
  }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      expectedTitle?: string;
    };
    const task = await classifyTask(taskId, body.expectedTitle);
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
