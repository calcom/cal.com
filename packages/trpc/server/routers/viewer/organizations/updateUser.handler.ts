import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TUpdateUserInputSchema } from "./updateuser.schema";

type UpdateUserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateUserInputSchema;
};

export const updateUserHandler = async ({ ctx, input }: UpdateUserOptions) => {
  const { user } = ctx;
  const { id: userId, organizationId } = user;
  if (!organizationId)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be a memeber of an organizaiton" });

  if (!(await isOrganisationAdmin(userId, organizationId))) throw new TRPCError({ code: "UNAUTHORIZED" });

  // Is requested user a member of the organization?
  const requestedMember = await prisma.membership.findFirst({
    where: {
      userId: input.userId,
      teamId: organizationId,
      accepted: true,
    },
  });

  if (!requestedMember)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User does not belong to your organization" });

  // Update user
  await prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      bio: input.bio,
      email: input.email,
      name: input.name,
      role: input.role,
      timeZone: input.timeZone,
    },
  });

  // TODO: audit log this

  return {
    success: true,
  };
};
