import type { Prisma } from "@prisma/client";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
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
  const { teamId, parentId } = group;

  const isFilterSet = (filters && hasFilter(filters)) || !!teamId;
  const isUpIdInFilter = filters?.upIds?.includes(userProfile.upId);

  const shouldListUserEvents =
    !isFilterSet || isUpIdInFilter || (isFilterSet && filters?.upIds && !isUpIdInFilter);

  const eventTypes: EventType[] = [];

  if (shouldListUserEvents || !teamId) {
    const baseQueryConditions = {
      teamId: null,
      schedulingType: null,
      ...(searchQuery ? { title: { contains: searchQuery, mode: "insensitive" as Prisma.QueryMode } } : {}),
    };

    const [nonChildEventTypes, childEventTypes] = await Promise.all([
      EventTypeRepository.findAllByUpId(
        {
          upId: userProfile.upId,
          userId: ctx.user.id,
        },
        {
          where: {
            ...baseQueryConditions,
            parentId: null,
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
      ),
      EventTypeRepository.findAllByUpId(
        {
          upId: userProfile.upId,
          userId: ctx.user.id,
        },
        {
          where: {
            ...baseQueryConditions,
            parentId: { not: null },
            userId: ctx.user.id,
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
      ),
    ]);

    const userEventTypes = [...(nonChildEventTypes ?? []), ...(childEventTypes ?? [])].sort((a, b) => {
      // First sort by position in descending order
      if (a.position !== b.position) {
        return b.position - a.position;
      }
      // Then by id in ascending order
      return a.id - b.id;
    });

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

  const mappedEventTypes: MappedEventType[] = await Promise.all(eventTypes.map(mapEventType));

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
    mappedEventTypes.forEach((evType) => {
      evType.users = [];
      evType.hosts = [];
    });

  return { eventTypes: mappedEventTypes, nextCursor: nextCursor ?? undefined };
};
