import { uploadTeamLogo } from "@calid/features/lib/avatar";
import type { IntervalLimit } from "@calid/features/lib/intervalLimit";
import { checkIntervalLimitOrder } from "@calid/features/lib/intervalLimit";
import type { Prisma } from "@prisma/client";

import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { uploadLogo } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZUpdateCalidTeamInput } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
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
    bannerUrl,
    faviconUrl,
    metadata,
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

  let logoUrl: string | null = team.logoUrl;
  let processedMetadata: Prisma.JsonObject = isPrismaObjOrUndefined(team.metadata) || {};

  if (logo !== undefined) {
    if (
      logo &&
      (logo.startsWith("data:image/png;base64,") ||
        logo.startsWith("data:image/jpeg;base64,") ||
        logo.startsWith("data:image/jpg;base64,"))
    ) {
      // New logo uploaded → replace
      logoUrl = await uploadTeamLogo({ teamId: id, logo });
    } else if (logo === null || logo === "" || logo === "delete") {
      logoUrl = null;
    }
  }

  if (slug && !team.slug) {
    processedMetadata = {
      ...processedMetadata,
      requestedSlug: slug,
    };
  } else if (slug) {
    // If we save slug, we don't need the requestedSlug anymore
    const { requestedSlug: _, ...cleanMetadata } = processedMetadata;
    processedMetadata = cleanMetadata;
  }

  // Handle metadata updates (including headerUrl)
  if (metadata !== undefined) {
    processedMetadata = {
      ...processedMetadata,
      ...metadata,
    };

    // Process headerUrl if present
    if (Object.prototype.hasOwnProperty.call(processedMetadata, "headerUrl")) {
      if (
        processedMetadata.headerUrl &&
        typeof processedMetadata.headerUrl === "string" &&
        (processedMetadata.headerUrl.startsWith("data:image/png;base64,") ||
          processedMetadata.headerUrl.startsWith("data:image/jpeg;base64,") ||
          processedMetadata.headerUrl.startsWith("data:image/jpg;base64,"))
      ) {
        const headerUrl = await resizeBase64Image(processedMetadata.headerUrl as string, { maxSize: 1500 });
        processedMetadata.headerUrl = await uploadLogo({
          logo: headerUrl,
          teamId: id,
          isHeader: true,
        });
      } else if (processedMetadata.headerUrl === null) {
        // Explicit clear
        await uploadLogo({
          logo: "delete",
          teamId: id,
          isHeader: true,
        });
        processedMetadata.headerUrl = null;
      }
    }
  }

  let processedBannerUrl: string | null = team.bannerUrl;
  if (
    bannerUrl !== undefined &&
    (bannerUrl === null ||
      bannerUrl === "delete" ||
      bannerUrl.startsWith("data:image/png;base64,") ||
      bannerUrl.startsWith("data:image/jpeg;base64,") ||
      bannerUrl.startsWith("data:image/jpg;base64,"))
  ) {
    processedBannerUrl = await uploadLogo({
      logo: bannerUrl === "delete" ? "delete" : bannerUrl ? await resizeBase64Image(bannerUrl) : "delete",
      teamId: id,
      isBanner: true,
    });
  }

  let processedFaviconUrl: string | null = team.faviconUrl || null;
  if (
    faviconUrl !== undefined &&
    (faviconUrl === null ||
      faviconUrl === "delete" ||
      faviconUrl.startsWith("data:image/png;base64,") ||
      faviconUrl.startsWith("data:image/jpeg;base64,") ||
      faviconUrl.startsWith("data:image/jpg;base64,"))
  ) {
    processedFaviconUrl = await uploadLogo({
      logo: faviconUrl === "delete" ? "delete" : faviconUrl ? await resizeBase64Image(faviconUrl) : "delete",
      teamId: id,
      isFavicon: true,
    });
  }

  const updatedCalIdTeam = await prisma.calIdTeam.update({
    where: { id: id },
    data: {
      name: name,
      slug: slug,
      metadata: processedMetadata,
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
      bannerUrl: processedBannerUrl,
      faviconUrl: processedFaviconUrl,
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
    bannerUrl: updatedCalIdTeam.bannerUrl,
    faviconUrl: updatedCalIdTeam.faviconUrl,
  };
};
