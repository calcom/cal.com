import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import {
  assertCanManageOrganization,
  assertOrganizationSlugAvailable,
  normalizeOrganizationSlug,
  organizationSelect,
} from "./organizationUtils";
import type { TUpdateOrganizationInputSchema } from "./schema";

type UpdateHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TUpdateOrganizationInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateHandlerOptions) => {
  const membership = await assertCanManageOrganization({ userId: ctx.user.id });
  const slug = normalizeOrganizationSlug(input.slug);

  await assertOrganizationSlugAvailable({
    slug,
    currentOrganizationId: membership.team.id,
  });

  return prisma.team.update({
    where: {
      id: membership.team.id,
    },
    data: {
      name: input.name,
      slug,
      bio: input.bio || null,
    },
    select: organizationSelect,
  });
};
