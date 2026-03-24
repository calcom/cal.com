import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUsernameSuggestions } from "@calcom/lib/server/usernameSuggestions";

const bodySchema = z.object({
  base: z.string().min(1).max(50),
});

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { base } = bodySchema.parse(body);

    const suggestions = await getUsernameSuggestions(base);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Username suggestions error:", error);
    return NextResponse.json({ error: "Failed to get username suggestions" }, { status: 400 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
