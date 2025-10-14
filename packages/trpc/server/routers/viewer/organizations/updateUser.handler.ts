import { ensureOrganizationIsReviewed } from "@calcom/ee/organizations/lib/ensureOrganizationIsReviewed";
import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { RoleManagementError } from "@calcom/features/pbac/domain/errors/role-management.error";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { checkRegularUsername } from "@calcom/features/profile/lib/checkRegularUsername";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaPromise, User, Membership, Profile } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import assignUserToAttributeHandler from "../attributes/assignUserToAttribute.handler";
import type { TUpdateUserInputSchema } from "./updateUser.schema";

type UpdateUserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateUserInputSchema;
};

const applyRoleToAllTeams = async (userId: number, teamIds: number[], role: MembershipRole) => {
  await prisma.membership.updateMany({
    where: {
      userId,
      teamId: {
        in: teamIds,
      },
    },
    data: {
      role,
    },
  });
};

export const updateUserHandler = async ({ ctx, input }: UpdateUserOptions) => {
  const { user } = ctx;
  const { id: userId, organizationId } = user;

  if (!organizationId)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be a member of an organizaiton" });

  const roleManager = await RoleManagementFactory.getInstance().createRoleManager(organizationId);

  try {
    await roleManager.checkPermissionToChangeRole(userId, organizationId, "org");
  } catch (error) {
    if (error instanceof RoleManagementError) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: error.message });
    }
    throw error;
  }

  await ensureOrganizationIsReviewed(organizationId);

  // Is requested user a member of the organization?
  const requestedMember = await prisma.membership.findFirst({
    where: {
      userId: input.userId,
      teamId: organizationId,
      accepted: true,
    },
    include: {
      team: {
        include: {
          children: {
            where: {
              members: {
                some: {
                  userId: input.userId,
                },
              },
            },
            include: {
              members: true,
            },
          },
        },
      },
      user: {
        select: {
          username: true,
          profiles: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });

  if (!requestedMember)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User does not belong to your organization" });

  const hasUsernameUpdated = input.username !== requestedMember.user.profiles[0]?.username;

  if (input.username && hasUsernameUpdated && user.profile.organization?.slug) {
    const checkRegularUsernameRes = await checkRegularUsername(
      input.username,
      user.profile.organization.slug
    );
    if (!checkRegularUsernameRes.available) {
      throw new TRPCError({ code: "BAD_REQUEST", message: checkRegularUsernameRes.message });
    }
  }

  const data: Prisma.UserUpdateInput = {
    bio: input.bio,
    email: input.email,
    name: input.name,
    timeZone: input.timeZone,
  };

  if (
    input.avatar &&
    (input.avatar.startsWith("data:image/png;base64,") ||
      input.avatar.startsWith("data:image/jpeg;base64,") ||
      input.avatar.startsWith("data:image/jpg;base64,"))
  ) {
    const avatar = await resizeBase64Image(input.avatar);
    data.avatarUrl = await uploadAvatar({
      avatar,
      userId: user.id,
    });
  }
  if (input.avatar === "") {
    data.avatarUrl = null;
  }

  // Update user
  const transactions: PrismaPromise<User | Membership | Profile>[] = [
    prisma.user.update({
      where: {
        id: input.userId,
      },
      data,
    }),
  ];

  if (hasUsernameUpdated) {
    transactions.push(
      prisma.profile.update({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId,
          },
        },
        data: {
          username: input.username,
        },
      })
    );
  }

  await prisma.$transaction(transactions);

  await roleManager.assignRole(input.userId, organizationId, input.role, requestedMember.id);

  if (input.attributeOptions) {
    await assignUserToAttributeHandler({
      ctx: {
        user: ctx.user,
      },
      input: input.attributeOptions,
    });
  }

  // We cast to membership role as we know pbac insnt enabled on this instance.
  if (checkAdminOrOwner(input.role as MembershipRole) && roleManager.isPBACEnabled) {
    const teamIds = requestedMember.team.children
      .map((sub_team) => sub_team.members.find((item) => item.userId === input.userId)?.teamId)
      .filter(Boolean) as number[]; //filter out undefined

    await applyRoleToAllTeams(input.userId, teamIds, input.role as MembershipRole);
  }
  // TODO: audit log this

  return {
    success: true,
  };
};

export default updateUserHandler;
