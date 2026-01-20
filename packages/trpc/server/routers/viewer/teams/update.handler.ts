import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import { uploadLogo } from "@calcom/lib/server/avatar";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole, RedirectType, RRTimestampBasis } from "@calcom/prisma/enums";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const prevTeam = await prisma.team.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      parentId: true,
      slug: true,
      metadata: true,
      rrTimestampBasis: true,
    },
  });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });

  if (!ctx.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasTeamUpdatePermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: input.id,
    permission: "team.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasTeamUpdatePermission) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (input.slug) {
    const orgId = ctx.user.organizationId;
    const teamRepository = new TeamRepository(prisma);
    const isSlugAvailable = await teamRepository.isSlugAvailableForUpdate({
      slug: input.slug,
      teamId: input.id,
      parentId: orgId,
    });
    if (!isSlugAvailable) {
      throw new TRPCError({ code: "CONFLICT", message: "Slug already in use." });
    }
  }

  if (input.bookingLimits) {
    const isValid = validateIntervalLimitOrder(input.bookingLimits);
    if (!isValid)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Booking limits must be in ascending order." });
  }

  const data: Prisma.TeamUpdateArgs["data"] = {
    name: input.name,
    bio: input.bio,
    hideBranding: input.hideBranding,
    isPrivate: input.isPrivate,
    hideBookATeamMember: input.hideBookATeamMember,
    hideTeamProfileLink: input.hideTeamProfileLink,
    brandColor: input.brandColor,
    darkBrandColor: input.darkBrandColor,
    theme: input.theme,
    bookingLimits: input.bookingLimits ?? undefined,
    includeManagedEventsInLimits: input.includeManagedEventsInLimits ?? undefined,
    rrResetInterval: input.rrResetInterval,
    rrTimestampBasis: input.rrTimestampBasis,
  };

  if (
    input.logo &&
    (input.logo.startsWith("data:image/png;base64,") ||
      input.logo.startsWith("data:image/jpeg;base64,") ||
      input.logo.startsWith("data:image/jpg;base64,"))
  ) {
    data.logoUrl = await uploadLogo({ teamId: input.id, logo: input.logo });
  } else if (typeof input.logo !== "undefined" && !input.logo) {
    data.logoUrl = null;
  }

  if (
    input.slug &&
    IS_TEAM_BILLING_ENABLED &&
    /** If the team doesn't have a slug we can assume that it hasn't been published yet. */
    !prevTeam.slug
  ) {
    // Save it on the metadata so we can use it later
    data.metadata = {
      requestedSlug: input.slug,
    };
  } else {
    data.slug = input.slug;

    // If we save slug, we don't need the requestedSlug anymore
    const metadataParse = teamMetadataStrictSchema.safeParse(prevTeam.metadata);
    if (metadataParse.success) {
      const { requestedSlug: _, ...cleanMetadata } = metadataParse.data || {};
      data.metadata = {
        ...cleanMetadata,
      };
    }
  }

  const updatedTeam = await prisma.team.update({
    where: { id: input.id },
    data,
  });

  if (
    data.rrTimestampBasis &&
    data.rrTimestampBasis !== RRTimestampBasis.CREATED_AT &&
    prevTeam.rrTimestampBasis === RRTimestampBasis.CREATED_AT
  ) {
    // disable load balancing for all event types
    await prisma.eventType.updateMany({
      where: {
        teamId: input.id,
      },
      data: {
        maxLeadThreshold: null,
      },
    });
  }

  if (updatedTeam.parentId && prevTeam.slug) {
    // No changes made lets skip this logic
    if (updatedTeam.slug === prevTeam.slug) return;

    // Fetch parent team slug to construct toUrl
    const parentTeam = await prisma.team.findUnique({
      where: {
        id: updatedTeam.parentId,
      },
      select: {
        slug: true,
      },
    });

    if (!parentTeam?.slug) {
      throw new Error(`Parent team with slug: ${parentTeam?.slug} not found`);
    }

    const orgUrlPrefix = getOrgFullOrigin(parentTeam.slug);

    const toUrlOld = `${orgUrlPrefix}/${prevTeam.slug}`;
    const toUrlNew = `${orgUrlPrefix}/${updatedTeam.slug}`;

    await prisma.tempOrgRedirect.updateMany({
      where: {
        type: RedirectType.Team,
        toUrl: toUrlOld,
      },
      data: {
        toUrl: toUrlNew,
      },
    });
  }

  return {
    logoUrl: updatedTeam.logoUrl,
    name: updatedTeam.name,
    bio: updatedTeam.bio,
    slug: updatedTeam.slug,
    theme: updatedTeam.theme,
    brandColor: updatedTeam.brandColor,
    darkBrandColor: updatedTeam.darkBrandColor,
    bookingLimits: updatedTeam.bookingLimits as IntervalLimit,
    includeManagedEventsInLimits: updatedTeam.includeManagedEventsInLimits,
    rrResetInterval: updatedTeam.rrResetInterval,
    rrTimestampBasis: updatedTeam.rrTimestampBasis,
  };
};

export default updateHandler;
