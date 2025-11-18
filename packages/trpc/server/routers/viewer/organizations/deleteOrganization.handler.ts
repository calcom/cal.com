import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole, RedirectType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteOrganizationInput } from "./deleteOrganization.schema";

const log = logger.getSubLogger({ prefix: ["organizations/deleteOrganization"] });

type DeleteOrganizationOption = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteOrganizationInput;
};

export const deleteOrganizationHandler = async ({ ctx, input }: DeleteOrganizationOption) => {
  const { user } = ctx;

  const foundOrg = await prisma.team.findUnique({
    where: {
      id: input.orgId,
      isOrganization: true,
    },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
          user: true,
        },
      },
    },
  });

  if (!foundOrg) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  const userMembership = foundOrg.members.find((member) => member.userId === user.id);

  if (!userMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this organization",
    });
  }

  if (userMembership.role !== MembershipRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners can delete the organization",
    });
  }

  if (foundOrg.slug) {
    try {
      await deleteDomain(foundOrg.slug);
    } catch {
      log.error(`Failed to delete domain ${foundOrg.slug}. Do a manual deletion if needed`);
    }
  }

  await deleteAllRedirectsForUsers(foundOrg.members.map((member) => member.user));

  await renameUsersToAvoidUsernameConflicts(foundOrg.members.map((member) => member.user));

  await prisma.team.delete({
    where: {
      id: input.orgId,
    },
  });

  return {
    ok: true,
    message: `Organization ${foundOrg.name} deleted successfully.`,
  };
};

export default deleteOrganizationHandler;

async function renameUsersToAvoidUsernameConflicts(users: { id: number; username: string | null }[]) {
  for (const user of users) {
    let currentUsername = user.username;

    if (!currentUsername) {
      currentUsername = "no-username";
      log.warn(`User ${user.id} has no username, defaulting to ${currentUsername}`);
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        // user.id being auto-incremented, we can safely assume that the username will be unique
        username: `${currentUsername}-${user.id}`,
      },
    });
  }
}

async function deleteAllRedirectsForUsers(users: { username: string | null }[]) {
  return await Promise.all(
    users
      .filter(
        (
          user
        ): user is {
          username: string;
        } => !!user.username
      )
      .map((user) =>
        prisma.tempOrgRedirect.deleteMany({
          where: {
            from: user.username,
            type: RedirectType.User,
            fromOrgId: 0,
          },
        })
      )
  );
}
