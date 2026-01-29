"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { RESERVED_SUBDOMAINS } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";

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

  // Get the user's organization ID from their profile
  const organizationId = session.user.profile?.organizationId ?? null;

  // Check if slug already exists within the organization scope (or globally if not in an org)
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

  // If user is in an organization, also check if the slug is taken by a user in the organization
  if (organizationId) {
    const existingUserWithSlug = await ProfileRepository.findByOrgIdAndUsername({
      organizationId,
      username: slug,
    });

    if (existingUserWithSlug) {
      return { available: false, message: "This slug is already taken by a user" };
    }
  }

  return { available: true };
}
