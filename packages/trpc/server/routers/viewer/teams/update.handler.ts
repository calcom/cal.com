import type { Prisma } from "@prisma/client";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { uploadLogo } from "@calcom/lib/server/uploadLogo";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";
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

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const isOrgAdmin = ctx.user?.organization?.isOrgAdmin;

  if (!isOrgAdmin) {
    if (!(await isTeamAdmin(ctx.user?.id, input.id))) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  if (input.slug) {
    const userConflict = await prisma.team.findMany({
      where: {
        slug: input.slug,
      },
    });
    if (userConflict.some((t) => t.id !== input.id)) return;
  }

  const prevTeam = await prisma.team.findFirst({
    where: {
      id: input.id,
    },
  });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });

  const data: Prisma.TeamUpdateArgs["data"] = {
    name: input.name,
    bio: input.bio,
    hideBranding: input.hideBranding,
    isPrivate: input.isPrivate,
    hideBookATeamMember: input.hideBookATeamMember,
    brandColor: input.brandColor,
    darkBrandColor: input.darkBrandColor,
    theme: input.theme,
  };

  if (input.logo && input.logo.startsWith("data:image/png;base64,")) {
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
    const metadataParse = teamMetadataSchema.safeParse(prevTeam.metadata);
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
      throw new Error(`Parent team wth slug: ${parentTeam?.slug} not found`);
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

  // Sync Services: Close.com
  if (prevTeam) closeComUpdateTeam(prevTeam, updatedTeam);

  return {
    logoUrl: updatedTeam.logoUrl,
    name: updatedTeam.name,
    bio: updatedTeam.bio,
    slug: updatedTeam.slug,
    theme: updatedTeam.theme,
    brandColor: updatedTeam.brandColor,
    darkBrandColor: updatedTeam.darkBrandColor,
  };
};

export default updateHandler;
