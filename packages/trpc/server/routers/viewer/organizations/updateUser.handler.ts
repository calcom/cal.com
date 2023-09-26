import { isOrganisationAdmin, isOrganisationOwner } from "@calcom/lib/server/queries/organisations";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TUpdateUserInputSchema } from "./updateUser.schema";

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

  // only OWNER can update the role to OWNER
  if (input.role === MembershipRole.OWNER && !(await isOrganisationOwner(userId, organizationId))) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

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

  let avatar = input.avatar;
  if (input.avatar) {
    avatar = await resizeBase64Image(input.avatar);
  }

  // Update user
  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: input.userId,
      },
      data: {
        bio: input.bio,
        email: input.email,
        name: input.name,
        timeZone: input.timeZone,
        avatar,
      },
    }),
    prisma.membership.update({
      where: {
        userId_teamId: {
          userId: input.userId,
          teamId: organizationId,
        },
      },
      data: {
        role: input.role,
      },
    }),
  ]);

  // TODO: audit log this

  return {
    success: true,
  };
};

export default updateUserHandler;
