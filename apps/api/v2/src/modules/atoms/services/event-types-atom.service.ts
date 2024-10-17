import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";

import {
  updateEventType,
  TUpdateEventTypeInputSchema,
  systemBeforeFieldEmail,
  getEventTypeById,
} from "@calcom/platform-libraries";
import { PrismaClient } from "@calcom/prisma/client";

@Injectable()
export class EventTypesAtomService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersService: UsersService,
    private readonly dbWrite: PrismaWriteService,
    private readonly dbRead: PrismaReadService,
    private readonly eventTypeService: EventTypesService_2024_06_14,
    private readonly teamEventTypeService: OrganizationsEventTypesService
  ) {}

  async getUserEventType(user: UserWithProfile, eventTypeId: number) {
    const organizationId = this.usersService.getUserMainOrgId(user);

    const isUserOrganizationAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;

    const eventType = await getEventTypeById({
      currentOrganizationId: this.usersService.getUserMainOrgId(user),
      eventTypeId,
      userId: user.id,
      prisma: this.dbRead.prisma as unknown as PrismaClient,
      isUserOrganizationAdmin,
      isTrpcCall: true,
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    if (eventType?.team?.id) {
      await this.checkTeamOwnsEventType(user.id, eventType.eventType.id, eventType.team.id);
    } else {
      this.eventTypeService.checkUserOwnsEventType(user.id, eventType.eventType);
    }

    return eventType;
  }

  async updateTeamEventType(
    eventTypeId: number,
    body: TUpdateEventTypeInputSchema,
    user: UserWithProfile,
    teamId: number
  ) {
    await this.checkCanUpdateTeamEventType(user.id, eventTypeId, teamId, body.scheduleId);
    const eventTypeUser = await this.eventTypeService.getUserToUpdateEvent(user);
    const bookingFields = [...(body.bookingFields || [])];

    if (
      !bookingFields.find((field) => field.type === "email") &&
      !bookingFields.find((field) => field.type === "phone")
    ) {
      bookingFields.push(systemBeforeFieldEmail);
    }

    const eventType = await updateEventType({
      input: { id: eventTypeId, ...body, bookingFields },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return eventType.eventType;
  }

  async updateEventType(eventTypeId: number, body: TUpdateEventTypeInputSchema, user: UserWithProfile) {
    await this.eventTypeService.checkCanUpdateEventType(user.id, eventTypeId, body.scheduleId);
    const eventTypeUser = await this.eventTypeService.getUserToUpdateEvent(user);
    const bookingFields = [...(body.bookingFields || [])];

    if (
      !bookingFields.find((field) => field.type === "email") &&
      !bookingFields.find((field) => field.type === "phone")
    ) {
      bookingFields.push(systemBeforeFieldEmail);
    }

    const eventType = await updateEventType({
      input: { id: eventTypeId, ...body, bookingFields },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return eventType.eventType;
  }

  async checkCanUpdateTeamEventType(userId: number, eventTypeId: number, teamId: number, scheduleId: number) {
    await this.checkTeamOwnsEventType(userId, eventTypeId, teamId);
    await this.teamEventTypeService.validateEventTypeExists(teamId, eventTypeId);
    await this.eventTypeService.checkUserOwnsSchedule(userId, scheduleId);
  }

  async checkTeamOwnsEventType(userId: number, eventTypeId: number, teamId: number) {
    const membership = await this.dbRead.prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
      },
      select: {
        team: {
          select: {
            eventTypes: true,
          },
        },
      },
    });
    if (!membership?.team?.eventTypes?.some((item) => item.id === eventTypeId)) {
      throw new ForbiddenException(`Team with ID=${teamId} does not own event type with ID=${eventTypeId}`);
    }
  }
}
