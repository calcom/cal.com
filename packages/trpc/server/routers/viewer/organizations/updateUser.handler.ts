import type { Prisma, PrismaPromise, User, Membership, Profile } from "@prisma/client";

import { ensureOrganizationIsReviewed } from "@calcom/ee/organizations/lib/ensureOrganizationIsReviewed";
import { checkRegularUsername } from "@calcom/lib/server/checkRegularUsername";
import { isOrganisationAdmin, isOrganisationOwner } from "@calcom/lib/server/queries/organisations";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { uploadAvatar } from "@calcom/trpc/server/routers/loggedInViewer/updateProfile.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

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
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be a memeber of an organizaiton" });

  if (!(await isOrganisationAdmin(userId, organizationId))) throw new TRPCError({ code: "UNAUTHORIZED" });

  await ensureOrganizationIsReviewed(organizationId);

  const isUpdaterAnOwner = await isOrganisationOwner(userId, organizationId);
  // only OWNER can update the role to OWNER
  if (input.role === MembershipRole.OWNER && !isUpdaterAnOwner) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const isUserBeingUpdatedOwner = await isOrganisationOwner(input.userId, organizationId);

  // only owner can update the role of another owner
  if (isUserBeingUpdatedOwner && !isUpdaterAnOwner) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

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
        },
      },
    },
  });

  if (!requestedMember)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User does not belong to your organization" });

  const hasUsernameUpdated = input.username !== requestedMember.user.username;

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
    username: input.username,
  };

  if (input.avatar && input.avatar.startsWith("data:image/png;base64,")) {
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

  if (input.role === MembershipRole.ADMIN || input.role === MembershipRole.OWNER) {
    const teamIds = requestedMember.team.children
      .map((sub_team) => sub_team.members.find((item) => item.userId === input.userId)?.teamId)
      .filter(Boolean) as number[]; //filter out undefined

    await applyRoleToAllTeams(input.userId, teamIds, input.role);
  }
  // TODO: audit log this

  return {
    success: true,
  };
};

export default updateUserHandler;
