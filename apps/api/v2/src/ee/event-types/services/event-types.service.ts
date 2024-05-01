import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/constants/constants";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { UpdateEventTypeInput } from "@/ee/event-types/inputs/update-event-type.input";
import { EventTypeOutput } from "@/ee/event-types/outputs/event-type.output";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { createEventType, updateEventType } from "@calcom/platform-libraries";
import { getEventTypesPublic, EventTypesPublic } from "@calcom/platform-libraries";
import { EventType } from "@calcom/prisma/client";

@Injectable()
export class EventTypesService {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async createUserEventType(user: UserWithProfile, body: CreateEventTypeInput): Promise<EventTypeOutput> {
    await this.checkCanCreateEventType(user.id, body);
    const eventTypeUser = await this.getUserToCreateEvent(user);
    const { eventType } = await createEventType({
      input: body,
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });
    return eventType as EventTypeOutput;
  }

  async checkCanCreateEventType(userId: number, body: CreateEventTypeInput) {
    const existsWithSlug = await this.eventTypesRepository.getUserEventTypeBySlug(userId, body.slug);
    if (existsWithSlug) {
      throw new BadRequestException("User already has an event type with this slug.");
    }
  }

  async getUserToCreateEvent(user: UserWithProfile) {
    const organizationId = user.movedToProfile?.organizationId || user.organizationId;
    const isOrgAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;
    const profileId = user.movedToProfile?.id || null;
    return {
      id: user.id,
      organizationId: user.organizationId,
      organization: { isOrgAdmin },
      profile: { id: profileId },
      metadata: user.metadata,
    };
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    const eventType = await this.eventTypesRepository.getUserEventType(userId, eventTypeId);

    if (!eventType) {
      return null;
    }

    this.checkUserOwnsEventType(userId, eventType);
    return eventType;
  }

  async getUserEventTypeForAtom(user: UserWithProfile, eventTypeId: number) {
    const organizationId = user.movedToProfile?.organizationId || user.organizationId;

    const isUserOrganizationAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;

    const eventType = await this.eventTypesRepository.getUserEventTypeForAtom(
      user,
      isUserOrganizationAdmin,
      eventTypeId
    );

    if (!eventType) {
      return null;
    }

    this.checkUserOwnsEventType(user.id, eventType.eventType);
    return eventType as { eventType: EventTypeOutput };
  }

  async getEventTypesPublicByUsername(username: string): Promise<EventTypesPublic> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return await getEventTypesPublic(user.id);
  }

  async createUserDefaultEventTypes(userId: number) {
    const { sixtyMinutes, sixtyMinutesVideo, thirtyMinutes, thirtyMinutesVideo } = DEFAULT_EVENT_TYPES;

    const defaultEventTypes = await Promise.all([
      this.eventTypesRepository.createUserEventType(userId, thirtyMinutes),
      this.eventTypesRepository.createUserEventType(userId, sixtyMinutes),
      this.eventTypesRepository.createUserEventType(userId, thirtyMinutesVideo),
      this.eventTypesRepository.createUserEventType(userId, sixtyMinutesVideo),
    ]);

    return defaultEventTypes;
  }

  async updateEventType(eventTypeId: number, body: UpdateEventTypeInput, user: UserWithProfile) {
    this.checkCanUpdateEventType(user.id, eventTypeId);
    const eventTypeUser = await this.getUserToUpdateEvent(user);
    await updateEventType({
      input: { id: eventTypeId, ...body },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    const eventType = await this.getUserEventTypeForAtom(user, eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return eventType.eventType;
  }

  async checkCanUpdateEventType(userId: number, eventTypeId: number) {
    const existingEventType = await this.getUserEventType(userId, eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
    this.checkUserOwnsEventType(userId, existingEventType);
  }

  async getUserToUpdateEvent(user: UserWithProfile) {
    const profileId = user.movedToProfile?.id || null;
    const selectedCalendars = await this.selectedCalendarsRepository.getUserSelectedCalendars(user.id);
    return { ...user, profile: { id: profileId }, selectedCalendars };
  }

  async deleteEventType(eventTypeId: number, userId: number) {
    const existingEventType = await this.eventTypesRepository.getEventTypeById(eventTypeId);
    if (!existingEventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    this.checkUserOwnsEventType(userId, existingEventType);

    return this.eventTypesRepository.deleteEventType(eventTypeId);
  }

  checkUserOwnsEventType(userId: number, eventType: Pick<EventType, "id" | "userId">) {
    if (userId !== eventType.userId) {
      throw new ForbiddenException(`User with ID=${userId} does not own event type with ID=${eventType.id}`);
    }
  }
}
