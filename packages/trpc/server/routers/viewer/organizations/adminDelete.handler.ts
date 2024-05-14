import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminDeleteInput } from "./adminDelete.schema";

const log = logger.getSubLogger({ prefix: ["organizations/adminDelete"] });
type AdminDeleteOption = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminDeleteInput;
};

export const adminDeleteHandler = async ({ input }: AdminDeleteOption) => {
  const foundOrg = await prisma.team.findUnique({
    where: {
      id: input.orgId,
      isOrganization: true,
    },
    include: {
      members: {
        select: {
          user: true,
        },
      },
    },
  });

  if (!foundOrg)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization not found",
    });

  if (foundOrg.slug) {
    try {
      await deleteDomain(foundOrg.slug);
    } catch (e) {
      log.error(`Failed to delete domain ${foundOrg.slug}. Do a manual deletion if needed`);
    }
  }

  await renameUsersToAvoidUsernameConflicts(foundOrg.members.map((member) => member.user));
  await prisma.team.delete({
    where: {
      id: input.orgId,
    },
  });

  return {
    ok: true,
    message: `Organization ${foundOrg.name} deleted.`,
  };
};

export default adminDeleteHandler;

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
