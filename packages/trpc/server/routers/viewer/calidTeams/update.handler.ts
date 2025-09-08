import { uploadTeamLogo } from "@calid/features/lib/avatar";
import type { IntervalLimit } from "@calid/features/lib/intervalLimit";
import { checkIntervalLimitOrder } from "@calid/features/lib/intervalLimit";
import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { ZUpdateCalidTeamInput } from "./update.schema";

type UpdateOptions = {
  input: ZUpdateCalidTeamInput;
};

export const updateCalidTeamHandler = async ({ ctx, input }: UpdateOptions) => {
  const {
    id,
    name,
    slug,
    logo,
    bio,
    hideTeamBranding,
    hideTeamProfileLink,
    isTeamPrivate,
    hideBookATeamMember,
    theme,
    brandColor,
    darkBrandColor,
    bookingFrequency,
  } = input;

  const team = await prisma.calIdTeam.findUnique({
    where: {
      id: id,
    },
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  const isTeamAdminOrOwner = await prisma.calIdMembership.findFirst({
    where: {
      userId: ctx.user.id,
      calIdTeamId: id,
      role: {
        in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
      },
    },
  });

  if (!isTeamAdminOrOwner) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized to update this team" });
  }

  if (slug) {
    const existingTeam = await prisma.calIdTeam.findMany({
      where: {
        slug: input.slug,
      },
    });
    if (existingTeam.some((t) => t.id !== id)) return;
  }

  if (bookingFrequency) {
    const isValid = checkIntervalLimitOrder(bookingFrequency);
    if (!isValid)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Frequency limits must be in ascending order" });
  }

  let logoUrl: string | null = logo || null;
  let metadata: Prisma.JsonObject = {};

  if (
    logo &&
    (logo.startsWith("data:image/png;base64,") ||
      logo.startsWith("data:image/jpeg;base64,") ||
      logo.startsWith("data:image/jpg;base64,"))
  ) {
    // New logo uploaded → replace
    logoUrl = await uploadTeamLogo({ teamId: id, logo });
  } else if (logo === null || logo === "") {
    logoUrl = null;
  }

  if (slug && !team.slug) {
    metadata = {
      requestedSlug: slug,
    };
  } else {
    metadata = {
      requestedSlug: undefined,
    };
  }

  const updatedCalIdTeam = await prisma.calIdTeam.update({
    where: { id: id },
    data: {
      name: name,
      slug: slug,
      metadata: metadata,
      logoUrl: logoUrl,
      bio: bio,
      hideTeamBranding: hideTeamBranding,
      hideTeamProfileLink: hideTeamProfileLink,
      isTeamPrivate: isTeamPrivate,
      hideBookATeamMember: hideBookATeamMember,
      theme: theme,
      brandColor: brandColor,
      darkBrandColor: darkBrandColor,
      bookingFrequency: bookingFrequency as IntervalLimit,
    },
  });

  return {
    id: updatedCalIdTeam.id,
    logoUrl: updatedCalIdTeam.logoUrl,
    name: updatedCalIdTeam.name,
    bio: updatedCalIdTeam.bio,
    slug: updatedCalIdTeam.slug,
    theme: updatedCalIdTeam.theme,
    brandColor: updatedCalIdTeam.brandColor,
    darkBrandColor: updatedCalIdTeam.darkBrandColor,
    bookingLimits: updatedCalIdTeam.bookingFrequency as IntervalLimit,
  };
};
