import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

/**
 * E2E-only endpoint for warming up the NextAuth session.
 * This triggers the jwt and session callbacks that populate the session
 * with profile, org, and other important data.
 *
 * Only available when NEXT_PUBLIC_IS_E2E=1 is set (automatically set by playwright.config.ts).
 */
async function getHandler() {
  // Gate this endpoint to E2E test mode only
  if (process.env.NEXT_PUBLIC_IS_E2E !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Create a legacy request object for compatibility with getServerSession
  const legacyReq = buildLegacyRequest(await headers(), await cookies());

  // Trigger session loading by calling getServerSession
  const session = await getServerSession({ req: legacyReq });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

export const GET = getHandler;
