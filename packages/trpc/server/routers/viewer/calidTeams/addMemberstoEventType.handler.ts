import type { Prisma } from "@prisma/client";

import { CalIdMembershipRole } from "@calcom/prisma/enums";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToEventType } from "./addMemberstoEventType.schema";

type AddBulkToEventTypeHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddMembersToEventType;
};

export async function addMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler) {
  const { eventTypeIds, userIds, teamId } = input;

  const calIdMembership = await prisma.calIdMembership.findFirst({
    where: {
      userId: ctx.user.id,
      calIdTeamId: teamId,
      role: {
        in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
      },
    },
  });

  if (!calIdMembership) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "You are not authorized to add members to event types in this team" 
    });
  }

  const data: Prisma.HostCreateManyInput[] = eventTypeIds.flatMap((eventId) =>
    userIds.map((userId) => ({
      eventTypeId: eventId,
      userId: userId,
      priority: 2,
    }))
  );

  return await prisma.host.createMany({
    data,
    skipDuplicates: true,
  });
}

export default addMembersToEventTypesHandler;
