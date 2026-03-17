import { NextRequest } from "next/server";
import { createTask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title: string;
      source?: "manual" | "import" | "github" | "voice";
    };
    const task = await createTask({
      title: body.title,
      source: body.source
    });
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
