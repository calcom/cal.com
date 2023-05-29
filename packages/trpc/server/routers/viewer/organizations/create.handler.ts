import { IS_ORGANIZATION_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { slug, name, logo, admin } = input;

  const slugCollisions = await prisma.team.findFirst({
    where: {
      slug: slug,
      metadata: {
        path: ["isOrganization"],
        equals: true,
      },
    },
  });

  if (slugCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });

  const createOwnerOrg = await prisma.user.create({
    data: {
      username: admin.username,
      email: admin.email,
      emailVerified: new Date(),
      organization: {
        create: {
          name,
          logo,
          ...(!IS_ORGANIZATION_BILLING_ENABLED && { slug }),
          metadata: {
            requestedSlug: slug,
            isOrganization: true,
          },
        },
      },
    },
  });

  await prisma.membership.create({
    data: {
      userId: createOwnerOrg.id,
      role: MembershipRole.OWNER,
      accepted: true,
      teamId: createOwnerOrg.organizationId!,
    },
  });

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);

  return createOwnerOrg;
};
