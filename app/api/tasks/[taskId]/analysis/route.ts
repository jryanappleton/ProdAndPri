import { NextRequest } from "next/server";
import { analyzeTask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const task = await analyzeTask(taskId);
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
