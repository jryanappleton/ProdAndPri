import { NextRequest } from "next/server";
import { createTag } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string;
      lens?: TodayLens;
    };

    await createTag(body.name);
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
