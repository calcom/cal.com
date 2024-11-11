import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { prisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

// import { SchedulingType } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "../../../trpc";
import type { TGetEventTypesFromGroupSchema } from "./getByViewer.schema";
import { mapEventType } from "./util";

const log = logger.getSubLogger({ prefix: ["getEventTypesFromGroup"] });

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetEventTypesFromGroupSchema;
};

type EventType = Awaited<ReturnType<typeof EventTypeRepository.findAllByUpId>>[number];

export const getEventTypesFromGroup = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getEventTypesFromGroup:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const userProfile = ctx.user.profile;
  const { group, limit, cursor, filters, searchQuery } = input;
  const { teamId, parentId } = group;

  const isFilterSet = (filters && hasFilter(filters)) || !!teamId;
  const isUpIdInFilter = filters?.upIds?.includes(userProfile.upId);

  const shouldListUserEvents =
    !isFilterSet || isUpIdInFilter || (isFilterSet && filters?.upIds && !isUpIdInFilter);

  const eventTypes: EventType[] = [];

  if (shouldListUserEvents || !teamId) {
    const userEventTypes =
      (await EventTypeRepository.findAllByUpId(
        {
          upId: userProfile.upId,
          userId: ctx.user.id,
        },
        {
          where: {
            teamId: null,
            schedulingType: null,
            ...(searchQuery ? { title: { contains: searchQuery, mode: "insensitive" } } : {}),
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
          cursor,
        }
      )) ?? [];

    eventTypes.push(...userEventTypes);
  }

  if (teamId) {
    const teamEventTypes =
      (await EventTypeRepository.findTeamEventTypes({
        teamId,
        parentId,
        userId: ctx.user.id,
        limit,
        cursor,
        where: {
          ...(isFilterSet && !!filters?.schedulingTypes
            ? {
                schedulingType: { in: filters.schedulingTypes },
              }
            : null),
          ...(searchQuery ? { title: { contains: searchQuery, mode: "insensitive" } } : {}),
        },
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ],
      })) ?? [];

    eventTypes.push(...teamEventTypes);
  }

  let nextCursor: typeof cursor | undefined = undefined;
  if (eventTypes && eventTypes.length > limit) {
    const nextItem = eventTypes.pop();
    nextCursor = nextItem?.id;
  }

  const mappedEventTypes = await Promise.all(eventTypes.map(mapEventType));

  log.info(
    "mappedEventTypes before filtering",
    safeStringify({
      input,
      mappedEventTypes,
    })
  );

  const filteredEventTypes = mappedEventTypes.filter((eventType) => {
    const isAChildEvent = eventType.parentId;
    if (!isAChildEvent) {
      return true;
    }
    // A child event only has one user
    const childEventAssignee = eventType.users[0];
    if (!childEventAssignee || childEventAssignee.id != ctx.user.id) {
      return false;
    }
    return true;
  });

  log.info(
    "mappedEventTypes after filtering",
    safeStringify({
      input,
      filteredEventTypes,
    })
  );

  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: teamId ?? 0,
      accepted: true,
      role: "MEMBER",
    },
    include: {
      team: {
        select: {
          isPrivate: true,
        },
      },
    },
  });

  if (membership && membership.team.isPrivate)
    filteredEventTypes.forEach((evType) => {
      evType.users = [];
      evType.hosts = [];
    });

  return {
    eventTypes: filteredEventTypes || [],
    nextCursor,
  };
};
