import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminDeleteInput } from "./adminDelete.schema";
import { Prisma } from "@calcom/prisma/client";

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

    return await  prisma.$transaction(async (tx) => {

      if ( foundOrg.slug ) {
        await deleteDomain(foundOrg.slug );
      }

      await deleteAllRedirectsForUsers(tx , foundOrg.members.map((member) => member.user));

      await renameUsersToAvoidUsernameConflicts(tx , foundOrg.members.map((member) => member.user));

      await tx.team.delete({
          where: {
            id: input.orgId,
          },
        });

      return {
        ok: true,
          message: `Organization ${foundOrg.name} deleted.`,
      }
    })
  };

  export default adminDeleteHandler;

async function renameUsersToAvoidUsernameConflicts(tx: Prisma.TransactionClient, users: { id: number; username: string | null }[]) {
  for (const user of users) {
    let currentUsername = user.username;

    if (!currentUsername) {
      currentUsername = "no-username";
      log.warn(`User ${user.id} has no username, defaulting to ${currentUsername}`);
    }

    const globalConflict = await tx.user.findFirst({
      where : {
        username: currentUsername,
        organizationId: null ,
        NOT :{
          id : user.id
        },
      },
      select : {
        id : true
      }
    });

    if ( globalConflict) {
      // Conflict Detected : Someone else owns the name globally and change the logic back to `username - user.id`
      await tx.user.update ({
        where : {
          id : user.id
        },
        data : {
          username : `${currentUsername}-${user.id}`,
          organizationId:null,
        },
      });
    } else {
      // Name is free globally.
      await tx.user.update ({
        where: {
          id : user.id
        },
        data : {
          username : currentUsername,
          organizationId:null,
        },
      });
    }
  }
}

async function deleteAllRedirectsForUsers(tx: Prisma.TransactionClient , users: { username: string | null }[]) {
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
        tx.tempOrgRedirect.deleteMany({
          where: {
            from: user.username,
            type: RedirectType.User,
            fromOrgId: 0,
          },
        })
      )
  );
}
