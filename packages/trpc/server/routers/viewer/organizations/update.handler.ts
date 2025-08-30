import type { Prisma } from "@prisma/client";

import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { uploadLogo } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
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

const updateOrganizationSettings = async ({
  organizationId,
  input,
  tx,
}: {
  organizationId: number;
  input: TUpdateInputSchema;
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
}) => {
  const data: Prisma.OrganizationSettingsUpdateInput = {};

  if (input.hasOwnProperty("lockEventTypeCreation")) {
    data.lockEventTypeCreationForUsers = input.lockEventTypeCreation;
  }

  if (input.hasOwnProperty("adminGetsNoSlotsNotification")) {
    data.adminGetsNoSlotsNotification = input.adminGetsNoSlotsNotification;
  }

  if (input.hasOwnProperty("allowSEOIndexing")) {
    data.allowSEOIndexing = input.allowSEOIndexing;
  }

  if (input.hasOwnProperty("orgProfileRedirectsToVerifiedDomain")) {
    data.orgProfileRedirectsToVerifiedDomain = input.orgProfileRedirectsToVerifiedDomain;
  }

  if (input.hasOwnProperty("disablePhoneOnlySMSNotifications")) {
    data.disablePhoneOnlySMSNotifications = input.disablePhoneOnlySMSNotifications;
  }

  // If no settings values have changed lets skip this update
  if (Object.keys(data).length === 0) return;

  await tx.organizationSettings.update({
    where: {
      organizationId,
    },
    data,
  });

  if (input.lockEventTypeCreation) {
    switch (input.lockEventTypeCreationOptions) {
      case "HIDE":
        await tx.eventType.updateMany({
          where: {
            teamId: null, // Not assigned to a team
            parentId: null, // Not a managed event type
            owner: {
              profiles: {
                some: {
                  organizationId,
                },
              },
            },
          },
          data: {
            hidden: true,
          },
        });

        break;
      case "DELETE":
        await tx.eventType.deleteMany({
          where: {
            teamId: null, // Not assigned to a team
            parentId: null, // Not a managed event type
            owner: {
              profiles: {
                some: {
                  organizationId,
                },
              },
            },
          },
        });
        break;
      default:
        break;
    }
  }
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  // A user can only have one org so we pass in their currentOrgId here
  const currentOrgId = ctx.user?.organization?.id || input.orgId;

  if (!currentOrgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization ID is required." });

  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: currentOrgId,
    },
    select: {
      role: true,
    },
  });

  if (!membership) throw new TRPCError({ code: "UNAUTHORIZED", message: "User role is required." });

  const { canEdit } = await getResourcePermissions({
    userId: ctx.user.id,
    teamId: currentOrgId,
    resource: Resource.Organization,
    userRole: membership.role,
    fallbackRoles: {
      update: {
        roles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      },
    },
  });

  if (!canEdit) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (input.slug) {
    const userConflict = await prisma.team.findMany({
      where: {
        slug: input.slug,
        parent: {
          id: currentOrgId,
        },
      },
    });
    if (userConflict.some((t) => t.id !== currentOrgId))
      throw new TRPCError({ code: "CONFLICT", message: "Slug already in use." });
  }

  const prevOrganisation = await prisma.team.findUnique({
    where: {
      id: currentOrgId,
    },
    select: {
      metadata: true,
      name: true,
      slug: true,
      bannerUrl: true,
    },
  });

  if (!prevOrganisation) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found." });

  const { mergeMetadata } = getMetadataHelpers(
    teamMetadataStrictSchema.unwrap(),
    prevOrganisation.metadata ?? {}
  );

  const data: Prisma.TeamUpdateArgs["data"] = {
    logoUrl: input.logoUrl,
    name: input.name,
    calVideoLogo: input.calVideoLogo,
    bio: input.bio,
    hideBranding: input.hideBranding,
    hideBookATeamMember: input.hideBookATeamMember,
    brandColor: input.brandColor,
    darkBrandColor: input.darkBrandColor,
    theme: input.theme,
    timeZone: input.timeZone,
    weekStart: input.weekStart,
    timeFormat: input.timeFormat,
    metadata: mergeMetadata({ ...input.metadata }),
  };

  if (
    input.banner &&
    (input.banner.startsWith("data:image/png;base64,") ||
      input.banner.startsWith("data:image/jpeg;base64,") ||
      input.banner.startsWith("data:image/jpg;base64,"))
  ) {
    const banner = await resizeBase64Image(input.banner, { maxSize: 1500 });
    data.bannerUrl = await uploadLogo({
      logo: banner,
      teamId: currentOrgId,
      isBanner: true,
    });
  } else {
    data.bannerUrl = null;
  }

  if (
    input.logoUrl &&
    (input.logoUrl.startsWith("data:image/png;base64,") ||
      input.logoUrl.startsWith("data:image/jpeg;base64,") ||
      input.logoUrl.startsWith("data:image/jpg;base64,"))
  ) {
    data.logoUrl = await uploadLogo({
      logo: await resizeBase64Image(input.logoUrl),
      teamId: currentOrgId,
    });
  }

  if (input.slug) {
    if (
      IS_TEAM_BILLING_ENABLED &&
      /** If the team doesn't have a slug we can assume that it hasn't been published yet. */
      !prevOrganisation.slug
    ) {
      // Save it on the metadata so we can use it later
      data.metadata = mergeMetadata({ requestedSlug: input.slug });
    } else {
      data.slug = input.slug;
      data.metadata = mergeMetadata({
        // If we save slug, we don't need the requestedSlug anymore
        requestedSlug: undefined,
        ...input.metadata,
      });
    }
  }

  const updatedOrganisation = await prisma.$transaction(async (tx) => {
    const updatedOrganisation = await tx.team.update({
      where: { id: currentOrgId },
      data,
    });

    await updateOrganizationSettings({ tx, input, organizationId: currentOrgId });

    return updatedOrganisation;
  });

  return { update: true, userId: ctx.user.id, data: updatedOrganisation };
};

export default updateHandler;
