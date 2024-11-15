import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { prisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

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
type MappedEventType = Awaited<ReturnType<typeof mapEventType>>;

export const getEventTypesFromGroup = async ({
  ctx,
  input,
}: GetByViewerOptions): Promise<{
  eventTypes: MappedEventType[];
  nextCursor: number | null | undefined;
}> => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getEventTypesFromGroup:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const userProfile = ctx.user.profile;
  const { group, limit, cursor, filters, searchQuery } = input;
  const { teamId } = group;

  const isFilterSet = (filters && hasFilter(filters)) || !!teamId;
  const isUpIdInFilter = filters?.upIds?.includes(userProfile.upId);

  const shouldListUserEvents =
    !isFilterSet || isUpIdInFilter || (isFilterSet && filters?.upIds && !isUpIdInFilter);

  const eventTypes: MappedEventType[] = [];
  let paginationCursor = cursor;
  let hasMoreResults = true;
  let isFirstFetch = true;

  const fetchAndFilterEventTypes = async () => {
    const batch = await fetchEventTypesBatch(ctx, input, shouldListUserEvents, paginationCursor, searchQuery);
    const filteredBatch = await filterEventTypes(batch.eventTypes, ctx.user.id, shouldListUserEvents, teamId);
    eventTypes.push(...filteredBatch);
    paginationCursor = batch.nextCursor;
    hasMoreResults = !!batch.nextCursor;
  };

  while (eventTypes.length < limit && (hasMoreResults || isFirstFetch)) {
    await fetchAndFilterEventTypes();
    isFirstFetch = false;
  }

  return {
    eventTypes,
    nextCursor: paginationCursor ?? undefined,
  };
};

const fetchEventTypesBatch = async (
  ctx: GetByViewerOptions["ctx"],
  input: GetByViewerOptions["input"],
  shouldListUserEvents: boolean | undefined,
  cursor: TGetEventTypesFromGroupSchema["cursor"],
  searchQuery: TGetEventTypesFromGroupSchema["searchQuery"]
) => {
  const userProfile = ctx.user.profile;
  const { group, limit, filters } = input;
  const { teamId, parentId } = group;
  const isFilterSet = (filters && hasFilter(filters)) || !!teamId;

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

  let nextCursor: number | null | undefined = undefined;
  if (eventTypes.length > limit) {
    const nextItem = eventTypes.pop();
    nextCursor = nextItem?.id;
  }

  const mappedEventTypes = await Promise.all(eventTypes.map(mapEventType));

  log.info(
    "fetchEventTypesBatch",
    safeStringify({
      mappedEventTypes,
    })
  );

  return { eventTypes: mappedEventTypes, nextCursor: nextCursor ?? undefined };
};

const filterEventTypes = async (
  eventTypes: MappedEventType[],
  userId: number,
  shouldListUserEvents: boolean | undefined,
  teamId: number | null | undefined
) => {
  const filteredEventTypes = eventTypes.filter((eventType) => {
    if (!eventType.parentId) {
      return true;
    }
    // A child event only has one user
    const childEventAssignee = eventType.users[0];

    if (!childEventAssignee || childEventAssignee.id !== userId) {
      return false;
    }
    return true;
  });

  log.info(
    "mappedEventTypes before and after filtering",
    safeStringify({
      beforeFiltering: eventTypes,
      afterFiltering: filteredEventTypes,
    })
  );

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
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

  log.info(
    "filteredEventTypes",
    safeStringify({
      filteredEventTypes,
    })
  );

  return filteredEventTypes;
};
