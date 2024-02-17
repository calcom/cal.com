import type { EventType as PrismaEventType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Ensure } from "@calcom/types/utils";

import { safeStringify } from "../../safeStringify";
import { eventTypeSelect } from "../eventTypeSelect";
import { LookupTarget, ProfileRepository } from "./profile";

const log = logger.getSubLogger({ prefix: ["repository/eventType"] });
type NotSupportedProps = "locations";
type IEventType = Ensure<
  Partial<
    Omit<Prisma.EventTypeCreateInput, NotSupportedProps> & {
      userId: PrismaEventType["userId"];
      profileId: PrismaEventType["profileId"];
      teamId: PrismaEventType["teamId"];
      parentId: PrismaEventType["parentId"];
      scheduleId: PrismaEventType["scheduleId"];
    }
  >,
  "title" | "slug" | "length"
>;

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
});

export class EventTypeRepository {
  static async create(data: IEventType) {
    const {
      userId,
      profileId,
      teamId,
      parentId,
      scheduleId,
      bookingLimits,
      recurringEvent,
      metadata,
      bookingFields,
      durationLimits,
      ...rest
    } = data;
    return await prisma.eventType.create({
      data: {
        ...rest,
        ...(userId ? { owner: { connect: { id: userId } } } : null),
        ...(profileId
          ? {
              profile: {
                connect: {
                  id: profileId,
                },
              },
            }
          : null),
        ...(teamId ? { team: { connect: { id: teamId } } } : null),
        ...(parentId ? { parent: { connect: { id: parentId } } } : null),
        ...(scheduleId ? { schedule: { connect: { id: scheduleId } } } : null),
        ...(metadata ? { metadata: metadata } : null),
        ...(bookingLimits
          ? {
              bookingLimits,
            }
          : null),
        ...(recurringEvent
          ? {
              recurringEvent,
            }
          : null),
        ...(bookingFields
          ? {
              bookingFields,
            }
          : null),
        ...(durationLimits
          ? {
              durationLimits,
            }
          : null),
      },
    });
  }

  static async findAllByUpId(
    { upId, userId }: { upId: string; userId: number },
    {
      orderBy,
      where = {},
    }: { orderBy?: Prisma.EventTypeOrderByWithRelationInput[]; where?: Prisma.EventTypeWhereInput } = {}
  ) {
    if (!upId) return [];
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    const profileId = lookupTarget.type === LookupTarget.User ? null : lookupTarget.id;
    const select = {
      ...eventTypeSelect,
      hashedLink: true,
      users: { select: userSelect },
      children: {
        include: {
          users: { select: userSelect },
        },
      },
      hosts: {
        include: {
          user: { select: userSelect },
        },
      },
    };

    log.debug(
      "findAllByUpId",
      safeStringify({
        upId,
        orderBy,
        argumentWhere: where,
      })
    );

    if (!profileId) {
      // Lookup is by userId
      return await prisma.eventType.findMany({
        where: {
          userId: lookupTarget.id,
          ...where,
        },
        select,
        orderBy,
      });
    }

    const profile = await ProfileRepository.findById(profileId);
    if (profile?.movedFromUser) {
      // Because the user has been moved to this profile, we need to get all user events except those that belong to some other profile
      // This is because those event-types that are created after moving to profile would have profileId but existing event-types would have profileId set to null
      return await prisma.eventType.findMany({
        where: {
          OR: [
            // Existing events
            {
              userId: profile.movedFromUser.id,
              profileId: null,
            },
            // New events
            {
              profileId,
            },
            // Fetch children event-types by userId because profileId is wrong
            {
              userId,
              parentId: {
                not: null,
              },
            },
          ],
          ...where,
        },
        select,
        orderBy,
      });
    } else {
      return await prisma.eventType.findMany({
        where: {
          OR: [
            {
              profileId,
            },
            // Fetch children event-types by userId because profileId is wrong
            {
              userId: userId,
              parentId: {
                not: null,
              },
            },
          ],
          ...where,
        },
        select,
        orderBy,
      });
    }
  }
}
