import { NextRequest } from "next/server";
import { createGitHubIssueForTask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      repositoryId: string;
    };

    const task = await createGitHubIssueForTask({
      taskId,
      repositoryId: body.repositoryId
    });

    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
