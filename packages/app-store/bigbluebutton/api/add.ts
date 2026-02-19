import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Restrict to POST: this endpoint creates a credential (state-changing).
  // Accepting GET would allow CSRF via a cross-site navigation.
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // `req.session` is populated by the app-store route dispatcher in
  // `apps/web/pages/api/integrations/[...args].ts` before this handler is
  // invoked (via `req.session = await getServerSession({ req })`).
  // The guard below handles the case where session is null (unauthenticated).
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  // CSRF protection: verify Origin header matches the request host.
  // For same-origin requests, browsers automatically set Origin to the page's origin.
  // Cross-site requests from an attacker's domain will have a different Origin.
  // This complements SameSite cookie protection and defends against older browsers
  // or misconfigured cookie settings.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Compare origin hostname with request host (strip port if present for comparison)
      const originHost = originUrl.host;
      if (originHost !== host) {
        return res.status(403).json({ message: "Invalid origin" });
      }
    } catch {
      return res.status(403).json({ message: "Invalid origin header" });
    }
  }
  // If no Origin header (can happen with same-site navigation in some browsers),
  // the session cookie (with SameSite=Lax by default in next-auth) provides protection.

  const { teamId, returnTo } = req.query;

  // Validate teamId before using it: Number(undefined) = NaN, which Prisma rejects with a 500.
  // Parse it first and gate all team-scoped logic on the valid numeric result.
  // Additionally, teamId must be > 0 since 0 is not a valid team ID in the database.
  const teamIdNum = teamId !== undefined ? Number(teamId) : null;
  if (teamId !== undefined && (isNaN(teamIdNum as number) || !Number.isInteger(teamIdNum) || (teamIdNum as number) <= 0)) {
    return res.status(400).json({ message: "Invalid teamId" });
  }

  await throwIfNotHaveAdminAccessToTeam({
    teamId: teamIdNum,
    userId: req.session.user.id,
  });

  const installForObject = teamIdNum !== null ? { teamId: teamIdNum } : { userId: req.session.user.id };
  const appType = "bigbluebutton_video";

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: { type: appType, ...installForObject },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...installForObject,
        appId: "bigbluebutton",
      },
    });

    // getSafeRedirectUrl validates the destination is same-origin/relative, preventing open redirect.
    const defaultPath = getInstalledAppPath(
      { variant: "conferencing", slug: "bigbluebutton" },
      "setup"
    );
    const redirectPath =
      returnTo ? (getSafeRedirectUrl(String(returnTo)) ?? defaultPath) : defaultPath;

    res.status(200).json({ url: redirectPath });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Already installed") {
        return res.status(422).json({ message: "Already installed" });
      }
    }
    console.error("Error installing BigBlueButton app:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ message: "Internal server error" });
  }
}
