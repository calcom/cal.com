"use server";

import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { RESERVED_SUBDOMAINS } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function checkTeamSlugAvailability(slug: string): Promise<{
  available: boolean;
  message?: string;
}> {
  if (!slug || slug.trim() === "") {
    return { available: false, message: "Slug is required" };
  }

  // Check if slug is reserved
  if (RESERVED_SUBDOMAINS.includes(slug)) {
    return { available: false, message: "This slug is reserved" };
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return { available: false, message: "Unauthorized" };
  }

  const organizationId = session.user.profile?.organizationId ?? null;

  // Check if slug already exists within the same parent context
  const existingTeam = await prisma.team.findFirst({
    where: {
      slug,
      parentId: organizationId,
    },
    select: {
      id: true,
    },
  });

  if (existingTeam) {
    return { available: false, message: "This slug is already taken" };
  }

  // For org child teams, also check if slug conflicts with a user's username in the org
  if (organizationId) {
    const userWithSlug = await prisma.profile.findFirst({
      where: {
        organizationId,
        username: slug,
      },
      select: {
        id: true,
      },
    });

    if (userWithSlug) {
      return { available: false, message: "This slug is already taken by a user in your organization" };
    }
  }

  return { available: true };
}
