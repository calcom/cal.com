import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { checkUsername } from "@calcom/lib/server/checkUsername";

const bodySchema = z.object({
  username: z.string(),
  orgSlug: z.string().optional(),
});

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, orgSlug } = bodySchema.parse(body);

    // Get current org domain from request headers
    const hostname = request.headers.get("host") || "";
    const { currentOrgDomain } = getOrgDomainConfig({ hostname });

    const result = await checkUsername(username, currentOrgDomain || orgSlug);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to check username availability" }, { status: 400 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
