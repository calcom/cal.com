import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

/**
 * E2E-only page for warming up the NextAuth session.
 * This triggers the jwt and session callbacks that populate the session
 * with profile, org, and other important data.
 *
 * Only available when NEXT_PUBLIC_IS_E2E=1 is set (automatically set by playwright.config.ts)
 * or in development mode.
 */
const Page = async () => {
  // Gate this page to E2E test mode or dev only
  if (process.env.NEXT_PUBLIC_IS_E2E !== "1" && process.env.NODE_ENV !== "development") {
    notFound();
  }

  // Create a legacy request object for compatibility with getServerSession
  const legacyReq = buildLegacyRequest(await headers(), await cookies());

  // Trigger session loading by calling getServerSession
  const session = await getServerSession({ req: legacyReq });

  if (!session) {
    return <div>Unauthorized</div>;
  }

  return <div>Session warmed up</div>;
};

export default Page;
