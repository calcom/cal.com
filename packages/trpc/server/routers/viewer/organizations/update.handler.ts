import type { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { uploadLogo } from "@calcom/lib/server/uploadLogo";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
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

const uploadBanner = async ({ teamId, banner: data }: { teamId: number; banner: string }) => {
  const objectKey = uuidv4();

  await prisma.avatar.upsert({
    where: {
      teamId_userId: {
        teamId,
        userId: 0,
      },
    },
    create: {
      teamId: teamId,
      data,
      objectKey,
    },
    update: {
      data,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
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

  let bannerUrl = prevOrganisation.bannerUrl;
  if (input.banner && input.banner.startsWith("data:image/png;base64,")) {
    const banner = await resizeBase64Image(input.banner, { maxSize: 1500 });
    bannerUrl = await uploadBanner({
      banner: banner,
      teamId: currentOrgId,
    });
  } else if (input.banner === "") {
    bannerUrl = null;
  }

  const { mergeMetadata } = getMetadataHelpers(teamMetadataSchema.unwrap(), prevOrganisation.metadata);

  const data: Prisma.TeamUpdateArgs["data"] = {
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
    bannerUrl,
  };

  if (input.logo && input.logo.startsWith("data:image/png;base64,")) {
    data.logo = input.logo;
    data.logoUrl = await uploadLogo({
      logo: input.logo,
      teamId: currentOrgId,
    });
  } else if (typeof input.logo !== "undefined" && !input.logo) {
    data.logo = data.logoUrl = null;
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

  const updatedOrganisation = await prisma.team.update({
    where: { id: currentOrgId },
    data,
  });

  // Sync Services: Close.com
  if (prevOrganisation) closeComUpdateTeam(prevOrganisation, updatedOrganisation);

  return { update: true, userId: ctx.user.id, data };
};

export default updateHandler;
