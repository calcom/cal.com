import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/constants/constants";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

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

  async createUserEventType(userId: number, body: CreateEventTypeInput) {
    return this.eventTypesRepository.createUserEventType(userId, body);
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    return this.eventTypesRepository.getUserEventType(userId, eventTypeId);
  }

  async getUserEventTypeForAtom(user: UserWithProfile, eventTypeId: number) {
    const organizationId = user.movedToProfile?.organizationId || user.organizationId;

    const isUserOrganizationAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;

    return this.eventTypesRepository.getUserEventTypeForAtom(user, isUserOrganizationAdmin, eventTypeId);
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

  async getUserToCreateEvent(user: UserWithProfile) {
    const organizationId = user.movedToProfile?.organizationId || user.organizationId;
    const isOrgAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;
    const profileId = user.movedToProfile?.id;
    return { ...user, organization: { isOrgAdmin }, profile: { id: profileId } };
  }

  async getUserToUpdateEvent(user: UserWithProfile) {
    const profileId = user.movedToProfile?.id;
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
