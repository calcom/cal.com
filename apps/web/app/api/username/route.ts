import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { checkUsername } from "@calcom/features/profile/lib/checkUsername";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  username: z.string(),
  orgSlug: z.string().optional(),
});

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, orgSlug } = bodySchema.parse(body);

    const legacyReq = buildLegacyRequest(await headers(), await cookies());

    // Get current org domain from request headers
    const { currentOrgDomain } = orgDomainConfig(legacyReq);

    const result = await checkUsername(username, currentOrgDomain || orgSlug);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to check username availability" }, { status: 400 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
