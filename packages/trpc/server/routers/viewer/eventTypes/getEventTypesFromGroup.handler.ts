import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetEventTypesFromGroupSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetEventTypesFromGroupSchema;
};

type EventType =
  | Awaited<ReturnType<typeof EventTypeRepository.findTeamEventTypes>>[number]
  | Awaited<ReturnType<typeof EventTypeRepository.findAllByUpId>>[number];

export const getEventTypesFromGroup = async ({ ctx, input }: GetByViewerOptions) => {
  const userProfile = ctx.user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);

  const { group, limit, skip, filters } = input;
  const { teamId, parentId } = group;
  console.log("getEventTypesFromGroup", group);

  let eventTypes: EventType[] = [];

  if (!teamId) {
    eventTypes = await EventTypeRepository.findAllByUpId(
      {
        upId: userProfile.upId,
        userId: ctx.user.id,
      },
      {
        where: {
          teamId: null,
        },
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ],
        limit,
      }
    );
    eventTypes = eventTypes.filter((evType) => evType.schedulingType !== SchedulingType.MANAGED);
  } else {
    eventTypes = await EventTypeRepository.findTeamEventTypes({
      teamId,
      parentId,
      userId: ctx.user.id,
      limit,
      orderBy: [
        {
          position: "desc",
        },
        {
          id: "asc",
        },
      ],
    });
  }

  const filterByTeamIds = async (eventType: EventType) => {
    if (!filters || !hasFilter(filters)) {
      return true;
    }
    return filters?.teamIds?.includes(eventType?.teamId || 0) ?? false;
  };
  const filterBySchedulingTypes = (evType: EventType) => {
    if (!filters || !hasFilter(filters) || !filters.schedulingTypes) {
      return true;
    }

    if (!evType.schedulingType) return false;

    return filters.schedulingTypes.includes(evType.schedulingType);
  };
  const filteredEventTypes = eventTypes
    .filter(filterByTeamIds)
    .filter((evType) => {
      const res = evType.userId === null || evType.userId === ctx.user.id;
      return res;
    })
    // .filter((evType) =>
    //   membership.role === MembershipRole.MEMBER ? evType.schedulingType !== SchedulingType.MANAGED : true
    // )
    .filter(filterBySchedulingTypes);

  return {
    eventTypes: filteredEventTypes,
    nextCursor: null,
  };
};
