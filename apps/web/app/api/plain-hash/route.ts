import { createHmac } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const responseSchema = z.object({
  hash: z.string(),
  email: z.string().email(),
  shortName: z.string(),
  appId: z.string(),
  fullName: z.string(),
  chatAvatarUrl: z.string(),
  userTier: z.enum(["free", "teams", "enterprise"]),
});

async function handler() {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session email found" }, { status: 401 });
  }

  const secret = process.env.PLAIN_CHAT_HMAC_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Missing Plain Chat secret" }, { status: 500 });
  }

  // Get user's team membership info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teams: {
        select: {
          team: {
            select: {
              metadata: true,
              parentId: true,
            },
          },
        },
      },
    },
  });

  // Check if user is part of a team and determine tier
  let userTier = "free";

  if (user?.teams.length) {
    const teamMemberships = user.teams;

    // Check if any team has isOrganization: true in metadata
    const isEnterprise = teamMemberships.some(
      (membership) => (membership.team.metadata as { isOrganization?: boolean })?.isOrganization === true
    );

    userTier = isEnterprise
      ? "enterprise"
      : teamMemberships.some((membership) => !membership.team.parentId)
      ? "teams"
      : "free";
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(session.user.email.toLowerCase().trim());
  const hash = hmac.digest("hex");

  const shortName =
    (session.user.name?.split(" ")[0] || session.user.email).charAt(0).toUpperCase() +
      (session.user.name?.split(" ")[0] || session.user.email).slice(1) || "User";

  const response = responseSchema.parse({
    hash,
    email: session.user.email || "user@example.com",
    shortName,
    appId: process.env.NEXT_PUBLIC_PLAIN_CHAT_ID,
    fullName: session.user.name || "User",
    chatAvatarUrl: session.user.avatarUrl || "",
    userTier,
  });

  return NextResponse.json(response);
}

export const POST = apiRouteMiddleware(handler);
