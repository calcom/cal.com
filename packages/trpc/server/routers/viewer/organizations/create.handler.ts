import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateOrganizationInputSchema } from "./schema";
import {
  assertOrganizationSlugAvailable,
  getEmailDomain,
  getProfileUsername,
  normalizeOrganizationSlug,
  organizationSelect,
} from "./organizationUtils";

type CreateHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TCreateOrganizationInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      email: true,
      username: true,
      organizationId: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  if (user.organizationId) {
    throw new TRPCError({ code: "CONFLICT", message: "User already belongs to an organization." });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      accepted: true,
      team: {
        isOrganization: true,
      },
    },
    select: { id: true },
  });

  if (existingMembership) {
    throw new TRPCError({ code: "CONFLICT", message: "User already belongs to an organization." });
  }

  const slug = normalizeOrganizationSlug(input.slug);
  await assertOrganizationSlugAvailable({ slug });

  return prisma.$transaction(async (tx) => {
    const organization = await tx.team.create({
      data: {
        name: input.name,
        slug,
        bio: input.bio || null,
        isOrganization: true,
        organizationSettings: {
          create: {
            orgAutoAcceptEmail: getEmailDomain(user.email),
            isOrganizationConfigured: true,
          },
        },
      },
      select: organizationSelect,
    });

    await tx.membership.create({
      data: {
        teamId: organization.id,
        userId: user.id,
        accepted: true,
        role: MembershipRole.OWNER,
      },
    });

    await tx.profile.create({
      data: {
        uid: uuidv4(),
        userId: user.id,
        organizationId: organization.id,
        username: getProfileUsername(user),
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { organizationId: organization.id },
    });

    return organization;
  });
};
