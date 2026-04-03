import { NextRequest } from "next/server";
import { errorJson } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    await request.text();
    throw new Error("Voice capture is temporarily disabled.");
  } catch (error) {
    return errorJson(error);
  }
}
