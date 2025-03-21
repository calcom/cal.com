import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { createHmac } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_PLAIN_CHAT_ENABLED } from "@calcom/lib/constants";
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
  // Early return if Plain Chat is not enabled
  if (!IS_PLAIN_CHAT_ENABLED) {
    return NextResponse.json({ error: "Plain Chat is not enabled" }, { status: 404 });
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
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
              isOrganization: true,
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

    const isEnterprise = teamMemberships.some((membership) => membership.team.isOrganization === true);
    const isTeams = user?.teams.length > 0;

    userTier = isEnterprise ? "enterprise" : isTeams ? "teams" : "free";
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

export const POST = defaultResponderForAppDir(handler);
