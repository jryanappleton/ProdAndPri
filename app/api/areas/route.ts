import { NextRequest } from "next/server";
import { createArea } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string;
    };
    const area = await createArea(body.name);
    return dataJson({ area });
  } catch (error) {
    return errorJson(error);
  }
}
