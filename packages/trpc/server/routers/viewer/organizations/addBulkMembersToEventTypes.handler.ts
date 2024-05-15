import type { Prisma } from "@prisma/client";

import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAddBulkMembersToEventTypes } from "./addBulkMembersToEventTypes.schema";
import { addBulkMembersToTeams } from "./utils";

type AddBulkToEventTypeHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddBulkMembersToEventTypes;
};

export async function addBulkMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler) {
  if (!ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // check if user is admin of organization
  if (!(await isOrganisationAdmin(ctx.user?.id, ctx.user.organizationId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const { eventTypeIds, teamIds, userIds } = input;

  // invite users to whatever teams necessary
  await addBulkMembersToTeams({
    user: ctx.user,
    input: {
      teamIds,
      userIds,
    },
  });

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

export default addBulkMembersToEventTypesHandler;
