import type { Prisma, EventType as PrismaEventType } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { Ensure } from "@calcom/types/utils";

import { LookupTarget, ProfileRepository } from "./profile";

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

  static async findAllByProfileId(
    { upId }: { upId: string },
    {
      orderBy,
      where = {},
    }: { orderBy?: Prisma.EventTypeOrderByWithRelationInput[]; where?: Prisma.EventTypeWhereInput } = {}
  ) {
    if (!upId) return [];
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    return await prisma.eventType.findMany({
      where: {
        ...(lookupTarget.type === LookupTarget.User
          ? {
              userId: lookupTarget.id,
            }
          : {
              profileId: lookupTarget.id,
            }),
        ...where,
      },
      include: {
        // TODO:  As required by getByViewHandler - Make it configurable
        team: {
          include: {
            eventTypes: true,
          },
        },
        hashedLink: true,
        users: true,
        children: {
          include: {
            users: true,
          },
        },
        hosts: {
          include: {
            user: true,
          },
        },
      },
      orderBy,
    });
  }
}
