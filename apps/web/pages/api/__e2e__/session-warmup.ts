import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

/**
 * E2E-only endpoint for warming up the NextAuth session.
 * This triggers the jwt and session callbacks that populate the session
 * with profile, org, and other important data.
 *
 * Only available when NEXT_PUBLIC_IS_E2E=1 is set (automatically set by playwright.config.ts).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Gate this endpoint to E2E test mode only
  if (process.env.NEXT_PUBLIC_IS_E2E !== "1") {
    return res.status(404).json({ error: "Not found" });
  }

  // Trigger session loading by calling getServerSession
  const session = await getServerSession({ req });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({ ok: true });
}

export default handler;
