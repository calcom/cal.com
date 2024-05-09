import type { Prisma } from "@prisma/client";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { uploadLogo } from "@calcom/lib/server/uploadLogo";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
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

  const isUserOrganizationAdmin = currentOrgId && (await isOrganisationAdmin(ctx.user?.id, currentOrgId));
  const isUserRoleAdmin = ctx.user.role === UserPermissionRole.ADMIN;

  const isUserAuthorizedToUpdate = !!(isUserOrganizationAdmin || isUserRoleAdmin);

  if (!currentOrgId || !isUserAuthorizedToUpdate) throw new TRPCError({ code: "UNAUTHORIZED" });

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

  const prevOrganisation = await prisma.team.findFirst({
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

  const { mergeMetadata } = getMetadataHelpers(teamMetadataSchema.unwrap(), prevOrganisation.metadata);

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

  if (input.banner && input.banner.startsWith("data:image/png;base64,")) {
    const banner = await resizeBase64Image(input.banner, { maxSize: 1500 });
    data.bannerUrl = await uploadLogo({
      logo: banner,
      teamId: currentOrgId,
      isBanner: true,
    });
  } else if (input.banner === "") {
    data.bannerUrl = null;
  }

  if (input.logoUrl && input.logoUrl.startsWith("data:image/png;base64,")) {
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

  // Sync Services: Close.com
  if (prevOrganisation) closeComUpdateTeam(prevOrganisation, updatedOrganisation);

  return { update: true, userId: ctx.user.id, data: updatedOrganisation };
};

export default updateHandler;
