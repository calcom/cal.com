import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "luxon";

import { dynamicEvent } from "@calcom/platform-libraries";
import { GetSlotsInput_2024_09_04 } from "@calcom/platform-types";

@Injectable()
export class SlotsInputService_2024_09_04 {
  constructor(
    private readonly eventTypeRepository: EventTypesRepository_2024_06_14,
    private readonly usersRepository: UsersRepository,
    private readonly organizationsUsersRepository: OrganizationsUsersRepository,
    private readonly organizationsRepository: OrganizationsRepository
  ) {}

  async transformGetSlotsQuery(query: GetSlotsInput_2024_09_04) {
    const eventType = await this.getEventType(query);
    if (!eventType) {
      throw new NotFoundException(`Event Type not found`);
    }
    const isTeamEvent = !!eventType?.teamId;

    const startTime = query.start;
    const endTime = this.adjustEndTime(query.end);
    const duration = query.duration;
    const eventTypeId = eventType.id;
    const eventTypeSlug = eventType.slug;
    const usernameList = "usernames" in query ? query.usernames : [];
    const timeZone = query.timeZone;
    const orgSlug = "organizationSlug" in query ? query.organizationSlug : null;

    return {
      isTeamEvent,
      startTime,
      endTime,
      duration,
      eventTypeId,
      eventTypeSlug,
      usernameList,
      timeZone,
      orgSlug,
    };
  }

  private async getEventType(input: GetSlotsInput_2024_09_04) {
    if ("eventTypeId" in input) {
      return this.eventTypeRepository.getEventTypeById(input.eventTypeId);
    }

    if ("eventTypeSlug" in input) {
      const user = await this.getEventTypeUser(input);
      if (!user) {
        throw new NotFoundException(`User with username ${input.username} not found`);
      }
      return this.eventTypeRepository.getUserEventTypeBySlug(user.id, input.eventTypeSlug);
    }

    return input.duration ? { ...dynamicEvent, length: input.duration } : dynamicEvent;
  }

  private async getEventTypeUser(input: GetSlotsInput_2024_09_04) {
    if ("eventTypeSlug" in input) {
      if ("organizationSlug" in input && input.organizationSlug) {
        const organization = await this.organizationsRepository.findOrgBySlug(input.organizationSlug);
        if (!organization) {
          throw new NotFoundException(
            `slots-input.service.ts: Organization with slug ${input.organizationSlug} not found`
          );
        }

        return await this.organizationsUsersRepository.getOrganizationUserByUsername(
          organization.id,
          input.username
        );
      }

      return await this.usersRepository.findByUsername(input.username);
    }
  }

  private adjustEndTime(endTime: string) {
    let dateTime = DateTime.fromISO(endTime, { zone: "utc" });
    if (dateTime.hour === 0 && dateTime.minute === 0 && dateTime.second === 0) {
      dateTime = dateTime.set({ hour: 23, minute: 59, second: 59 });
    }

    return dateTime.toISO();
  }
}
