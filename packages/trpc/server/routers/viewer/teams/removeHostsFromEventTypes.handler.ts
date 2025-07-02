import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";

type RemoveHostsFromEventTypes = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveHostsFromEventTypes;
};

export async function removeHostsFromEventTypesHandler({ ctx, input }: RemoveHostsFromEventTypes) {
  const { userIds, eventTypeIds, teamId } = input;
  const isTeamAdminOrOwner =
    (await isTeamAdmin(ctx.user.id, teamId)) || (await isTeamOwner(ctx.user.id, teamId));

  // check if user is admin or owner of team
  if (!isTeamAdminOrOwner) throw new TRPCError({ code: "UNAUTHORIZED" });

  return await prisma.host.deleteMany({
    where: {
      eventTypeId: {
        in: eventTypeIds,
      },
      userId: {
        in: userIds,
      },
    },
  });
}

export default removeHostsFromEventTypesHandler;
