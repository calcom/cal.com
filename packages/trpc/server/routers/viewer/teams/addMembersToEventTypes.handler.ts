import { isTeamAdmin, isTeamOwner } from "@calcom/features/ee/teams/lib/queries";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToEventTypes } from "./addMembersToEventTypes.schema";

type AddBulkToEventTypeHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddMembersToEventTypes;
};

export async function addMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler) {
  const { eventTypeIds, userIds, teamId } = input;

  const isTeamAdminOrOwner =
    (await isTeamAdmin(ctx.user.id, teamId)) || (await isTeamOwner(ctx.user.id, teamId));

  // check if user is admin or owner of team
  if (!isTeamAdminOrOwner) throw new TRPCError({ code: "UNAUTHORIZED" });

  const data: Prisma.HostCreateManyInput[] = eventTypeIds.flatMap((eventId) =>
    userIds.map((userId) => ({
      eventTypeId: eventId,
      userId: userId,
      priority: 2, // Default medium priority
    }))
  );

  return await prisma.host.createMany({
    data,
    // skip if user already a host in eventType
    skipDuplicates: true,
  });
}

export default addMembersToEventTypesHandler;
