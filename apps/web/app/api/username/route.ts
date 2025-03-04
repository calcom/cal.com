import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { checkUsername } from "@calcom/lib/server/checkUsername";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const bodySchema = z.object({
  username: z.string(),
  orgSlug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, orgSlug } = bodySchema.parse(body);

    const legacyReq = buildLegacyRequest(headers(), cookies());

    // Get current org domain from request headers
    const { currentOrgDomain } = orgDomainConfig(legacyReq);

    const result = await checkUsername(username, currentOrgDomain || orgSlug);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to check username availability" }, { status: 400 });
  }
}
