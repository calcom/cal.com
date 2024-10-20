import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { AtomsRepository } from "@/modules/atoms/atoms.repository";
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
import { getClientSecretFromPayment, EventTypeMetaDataSchema } from "@calcom/platform-libraries-1.2.3";
import { PrismaClient } from "@calcom/prisma/client";

@Injectable()
export class EventTypesAtomService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly atomsRepository: AtomsRepository,
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

  async getUserPaymentInfo(uid: string) {
    const rawPayment = await this.atomsRepository.getRawPayment(uid);

    if (!rawPayment) throw new NotFoundException(`Payment with uid ${uid} not found`);

    const { data, booking: _booking, ...restPayment } = rawPayment;

    const payment = {
      ...restPayment,
      data: data as Record<string, unknown>,
    };

    if (!_booking) throw new NotFoundException(`Booking with uid ${uid} not found`);

    const { startTime, endTime, eventType, ...restBooking } = _booking;
    const booking = {
      ...restBooking,
      startTime: startTime.toString(),
      endTime: endTime.toString(),
    };

    if (!eventType) throw new NotFoundException(`Event type with uid ${uid} not found`);

    if (eventType.users.length === 0 && !!!eventType.team)
      throw new NotFoundException(`No users found or no team present for event type with uid ${uid}`);

    const [user] = eventType?.users.length
      ? eventType.users
      : [{ name: null, theme: null, hideBranding: null, username: null }];
    const profile = {
      name: eventType.team?.name || user?.name || null,
      theme: (!eventType.team?.name && user?.theme) || null,
      hideBranding: eventType.team?.hideBranding || user?.hideBranding || null,
    };

    return {
      user,
      eventType: {
        ...eventType,
        metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
      },
      booking,
      payment,
      clientSecret: getClientSecretFromPayment(payment),
      profile,
    };
  }
}
