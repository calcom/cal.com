import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

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
    private readonly eventTypeService: EventTypesService_2024_06_14
  ) {}

  async getUserEventType(user: UserWithProfile, eventTypeId: number) {
    this.eventTypeService.checkUserOwnsEventType(user.id, { id: eventTypeId, userId: user.id });
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

    this.eventTypeService.checkUserOwnsEventType(user.id, eventType.eventType);
    return eventType;
  }

  async updateEventType(eventTypeId: number, body: TUpdateEventTypeInputSchema, user: UserWithProfile) {
    this.eventTypeService.checkCanUpdateEventType(user.id, eventTypeId, body.scheduleId);
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
}
