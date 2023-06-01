import type { Prisma } from "@prisma/client";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
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

async function updateAdminPassword(userId: number, password?: string) {
  if (password) {
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });
  }
}

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  // A user can only have one org so we pass in their currentOrgId here
  const currentOrgId = ctx.user?.organization?.id;

  if (!currentOrgId) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (!(await isOrganisationAdmin(ctx.user?.id, currentOrgId))) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (input.slug) {
    const userConflict = await prisma.team.findMany({
      where: {
        slug: input.slug,
      },
    });
    if (userConflict.some((t) => t.id !== currentOrgId)) return;
  }

  const prevOrganisation = await prisma.team.findFirst({
    where: {
      id: currentOrgId,
    },
    select: {
      metadata: true,
      name: true,
      slug: true,
    },
  });

  if (!prevOrganisation) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found." });

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
    !prevOrganisation.slug
  ) {
    // Save it on the metadata so we can use it later
    data.metadata = {
      requestedSlug: input.slug,
    };
  } else {
    data.slug = input.slug;

    // If we save slug, we don't need the requestedSlug anymore
    const metadataParse = teamMetadataSchema.safeParse(prevOrganisation.metadata);
    if (metadataParse.success) {
      const { requestedSlug: _, ...cleanMetadata } = metadataParse.data || {};
      data.metadata = {
        ...cleanMetadata,
      };
    }
  }

  const updatedOrganisation = await prisma.team.update({
    where: { id: currentOrgId },
    data,
  });

  updateAdminPassword(ctx.user.id, input.password);

  // Sync Services: Close.com
  if (prevOrganisation) closeComUpdateTeam(prevOrganisation, updatedOrganisation);

  return { update: true, userId: ctx.user.id };
};
