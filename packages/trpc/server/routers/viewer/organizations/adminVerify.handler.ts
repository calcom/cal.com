import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminVerifyInput } from "./adminVerify.schema";

type AdminVerifyOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminVerifyInput;
};

export const adminVerifyHandler = async ({ input }: AdminVerifyOptions) => {
  const foundOrg = await prisma.team.findFirst({
    where: {
      id: input.orgId,
      isOrganization: true,
    },
    include: {
      members: {
        where: {
          role: "OWNER",
        },
        include: {
          user: true,
        },
      },
    },
  });

  if (!foundOrg)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This team isn't an org or doesn't exist",
    });

  const acceptedEmailDomain = foundOrg.members[0].user.email.split("@")[1];

  await prisma.organizationSettings.update({
    where: {
      organizationId: input.orgId,
    },
    data: {
      isOrganizationVerified: true,
    },
  });

  const foundUsersWithMatchingEmailDomain = await prisma.user.findMany({
    where: {
      email: {
        endsWith: acceptedEmailDomain,
      },
      teams: {
        some: {
          teamId: input.orgId,
        },
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      profiles: {
        where: {
          organizationId: foundOrg.id,
        },
      },
    },
  });

  const users = foundUsersWithMatchingEmailDomain;
  const userIds = users.map((user) => user.id);

  const usersNotHavingProfileWithTheOrg = users.filter((user) => user.profiles.length === 0);
  await prisma.$transaction([
    prisma.membership.updateMany({
      where: {
        userId: {
          in: userIds,
        },
        OR: [
          {
            team: {
              parentId: input.orgId,
            },
          },
          {
            teamId: input.orgId,
          },
        ],
      },
      data: {
        accepted: true,
      },
    }),

    prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        organizationId: input.orgId,
      },
    }),

    ProfileRepository.createMany({
      users: usersNotHavingProfileWithTheOrg.map((user) => {
        return {
          id: user.id,
          username: user.username || user.email.split("@")[0],
          email: user.email,
        };
      }),
      organizationId: input.orgId,
      orgAutoAcceptEmail: acceptedEmailDomain,
    }),
  ]);

  return {
    ok: true,
    message: `Verified Organization - Auto accepted all members ending in ${acceptedEmailDomain}`,
  };
};

export default adminVerifyHandler;
