import { NextRequest } from "next/server";
import { syncGitHubIssues, toggleGitHubConnection } from "@/lib/server/app-state";
import { bootstrapJson, dataJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: "toggle" | "sync";
      lens?: TodayLens;
    };

    if (body.action === "toggle") {
      const connected = await toggleGitHubConnection();
      return dataJson({ connected });
    } else {
      await syncGitHubIssues();
      return await bootstrapJson(body.lens);
    }
  } catch (error) {
    return errorJson(error);
  }
}
