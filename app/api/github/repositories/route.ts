import { NextRequest } from "next/server";
import { addGitHubRepository } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      owner: string;
      repo: string;
    };

    const repository = await addGitHubRepository({
      owner: body.owner,
      repo: body.repo
    });

    return dataJson({ repository });
  } catch (error) {
    return errorJson(error);
  }
}
