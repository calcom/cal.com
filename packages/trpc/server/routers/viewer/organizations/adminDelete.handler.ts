import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
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
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
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

  await deleteAllRedirectsForUsers(foundOrg.members.map((member) => member.user));

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
  if (users.length === 0) return;

  for (const user of users) {
    if (!user.username) {
      log.warn(`User ${user.id} has no username, defaulting to no-username`);
    }
  }

  // Batch all username updates using a single raw query instead of N individual updates.
  // Each user gets `{currentUsername}-{userId}` to guarantee uniqueness.
  await prisma.$executeRaw`
    UPDATE "users"
    SET "username" = CONCAT(COALESCE("username", 'no-username'), '-', "id"::text)
    WHERE "id" IN (${Prisma.join(users.map((u) => u.id))})
  `;
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
