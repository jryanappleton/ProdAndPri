import { NextRequest } from "next/server";
import { createVoiceCapture } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      lens?: TodayLens;
    };
    await createVoiceCapture();
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
