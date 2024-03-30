import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/constants/constants";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { createEventType } from "@calcom/platform-libraries";
import { getEventTypesPublic, EventTypesPublic } from "@calcom/platform-libraries";
import { EventType } from "@calcom/prisma/client";

@Injectable()
export class EventTypesService {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository
  ) {}

  async createUserEventType(user: UserWithProfile, body: CreateEventTypeInput) {
    await this.checkCanCreateEventType(user, body);
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
    return eventType;
  }

  async checkCanCreateEventType(user: UserWithProfile, body: CreateEventTypeInput) {
    const existsWithSlug = await this.eventTypesRepository.getUserEventTypeBySlug(user.id, body.slug);
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

    checkUserOwnsEventType(userId, eventType);
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

    checkUserOwnsEventType(user.id, eventType.eventType);
    return eventType;
  }

  async getEventTypesPublicByUsername(username: string): Promise<EventTypesPublic> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return await getEventTypesPublic(user.id);
  }

  async createUserDefaultEventTypes(userId: number) {
    const thirtyMinutes = DEFAULT_EVENT_TYPES.thirtyMinutes;
    const thirtyMinutesVideo = DEFAULT_EVENT_TYPES.thirtyMinutesVideo;

    const sixtyMinutes = DEFAULT_EVENT_TYPES.sixtyMinutes;
    const sixtyMinutesVideo = DEFAULT_EVENT_TYPES.sixtyMinutesVideo;

    const defaultEventTypes = await Promise.all([
      this.eventTypesRepository.createUserEventType(userId, thirtyMinutes),
      this.eventTypesRepository.createUserEventType(userId, sixtyMinutes),
      this.eventTypesRepository.createUserEventType(userId, thirtyMinutesVideo),
      this.eventTypesRepository.createUserEventType(userId, sixtyMinutesVideo),
    ]);

    return defaultEventTypes;
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

    checkUserOwnsEventType(userId, existingEventType);

    return this.eventTypesRepository.deleteEventType(eventTypeId);
  }
}

export function checkUserOwnsEventType(userId: number, eventType: Pick<EventType, "id" | "userId">) {
  if (userId !== eventType.userId) {
    throw new ForbiddenException(`User with ID=${userId} does not own event type with ID=${eventType.id}`);
  }
}
