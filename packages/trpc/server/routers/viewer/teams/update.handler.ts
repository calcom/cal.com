import type { Prisma } from "@prisma/client";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
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
  if (!(await isTeamAdmin(ctx.user?.id, input.id))) throw new TRPCError({ code: "UNAUTHORIZED" });

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
    logo: input.logo,
    bio: input.bio,
    hideBranding: input.hideBranding,
    hideBookATeamMember: input.hideBookATeamMember,
    brandColor: input.brandColor,
    darkBrandColor: input.darkBrandColor,
    theme: input.theme,
  };

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

  // Sync Services: Close.com
  if (prevTeam) closeComUpdateTeam(prevTeam, updatedTeam);
};
