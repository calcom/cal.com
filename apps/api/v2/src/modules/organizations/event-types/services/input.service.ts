import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { transformTeamLocationsApiToInternal } from "@/ee/event-types/event-types_2024_06_14/transformers/api-to-internal/locations";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import {
  CreateTeamEventTypeInput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
  HostPriority,
} from "@calcom/platform-types";
import { SchedulingType } from "@calcom/prisma/client";

export type TransformedCreateTeamEventTypeInput = Awaited<
  ReturnType<InstanceType<typeof InputOrganizationsEventTypesService>["transformInputCreateTeamEventType"]>
>;

export type TransformedUpdateTeamEventTypeInput = Awaited<
  ReturnType<InstanceType<typeof InputOrganizationsEventTypesService>["transformInputUpdateTeamEventType"]>
>;
@Injectable()
export class InputOrganizationsEventTypesService {
  constructor(
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly teamsRepository: TeamsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository,
    private readonly conferencingService: OrganizationsConferencingService,
    private readonly conferencingRepository: ConferencingRepository
  ) {}
  async transformAndValidateCreateTeamEventTypeInput(
    userId: number,
    teamId: number,
    inputEventType: CreateTeamEventTypeInput_2024_06_14
  ) {
    await this.validateInputLocations(teamId, inputEventType.locations);
    await this.validateHosts(teamId, inputEventType.hosts);
    await this.validateTeamEventTypeSlug(teamId, inputEventType.slug);

    const transformedBody = await this.transformInputCreateTeamEventType(teamId, inputEventType);

    await this.inputEventTypesService.validateEventTypeInputs({
      seatsPerTimeSlot: transformedBody.seatsPerTimeSlot,
      locations: transformedBody.locations,
      requiresConfirmation: transformedBody.requiresConfirmation,
      eventName: transformedBody.eventName,
    });

    transformedBody.destinationCalendar &&
      (await this.inputEventTypesService.validateInputDestinationCalendar(
        userId,
        transformedBody.destinationCalendar
      ));

    transformedBody.useEventTypeDestinationCalendarEmail &&
      (await this.inputEventTypesService.validateInputUseDestinationCalendarEmail(userId));

    return transformedBody;
  }

  async transformAndValidateUpdateTeamEventTypeInput(
    userId: number,
    eventTypeId: number,
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14
  ) {
    await this.validateInputLocations(teamId, inputEventType.locations);
    await this.validateHosts(teamId, inputEventType.hosts);
    if (inputEventType.slug) {
      await this.validateTeamEventTypeSlug(teamId, inputEventType.slug);
    }

    const transformedBody = await this.transformInputUpdateTeamEventType(eventTypeId, teamId, inputEventType);

    await this.inputEventTypesService.validateEventTypeInputs({
      eventTypeId: eventTypeId,
      seatsPerTimeSlot: transformedBody.seatsPerTimeSlot,
      locations: transformedBody.locations,
      requiresConfirmation: transformedBody.requiresConfirmation,
      eventName: transformedBody.eventName,
    });

    transformedBody.destinationCalendar &&
      (await this.inputEventTypesService.validateInputDestinationCalendar(
        userId,
        transformedBody.destinationCalendar
      ));

    transformedBody.useEventTypeDestinationCalendarEmail &&
      (await this.inputEventTypesService.validateInputUseDestinationCalendarEmail(userId));

    return transformedBody;
  }

  async validateTeamEventTypeSlug(teamId: number, slug: string) {
    const teamEventWithSlugExists = await this.teamsEventTypesRepository.getEventTypeByTeamIdAndSlug(
      teamId,
      slug
    );

    if (teamEventWithSlugExists) {
      throw new BadRequestException("Team event type with this slug already exists");
    }
  }

  async transformInputCreateTeamEventType(
    teamId: number,
    inputEventType: CreateTeamEventTypeInput_2024_06_14
  ) {
    const { hosts, assignAllTeamMembers, locations, ...rest } = inputEventType;

    const eventType = this.inputEventTypesService.transformInputCreateEventType(rest);

    const defaultLocations: CreateTeamEventTypeInput_2024_06_14["locations"] = [
      {
        type: "integration",
        integration: "cal-video",
      },
    ];

    const children = await this.getChildEventTypesForManagedEventTypeCreate(inputEventType, teamId);

    const metadata =
      rest.schedulingType === "MANAGED"
        ? { managedEventConfig: {}, ...eventType.metadata }
        : eventType.metadata;

    const teamEventType = {
      ...eventType,
      // note(Lauris): we don't populate hosts for managed event-types because they are handled by the children
      hosts: !(rest.schedulingType === "MANAGED")
        ? assignAllTeamMembers
          ? await this.getAllTeamMembers(teamId, inputEventType.schedulingType)
          : this.transformInputHosts(hosts, inputEventType.schedulingType)
        : undefined,
      assignAllTeamMembers,
      locations: this.transformInputTeamLocations(locations || defaultLocations),
      metadata,
      children,
    };

    return teamEventType;
  }

  async transformInputUpdateTeamEventType(
    eventTypeId: number,
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14
  ) {
    const { hosts, assignAllTeamMembers, locations, ...rest } = inputEventType;

    const eventType = await this.inputEventTypesService.transformInputUpdateEventType(rest, eventTypeId);
    const dbEventType = await this.teamsEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!dbEventType) {
      throw new BadRequestException("Event type to update not found");
    }

    const children =
      dbEventType.schedulingType === "MANAGED"
        ? await this.getChildEventTypesForManagedEventTypeUpdate(eventTypeId, inputEventType, teamId)
        : undefined;

    const teamEventType = {
      ...eventType,
      // note(Lauris): we don't populate hosts for managed event-types because they are handled by the children
      hosts: !children
        ? assignAllTeamMembers
          ? await this.getAllTeamMembers(teamId, dbEventType.schedulingType)
          : this.transformInputHosts(hosts, dbEventType.schedulingType)
        : undefined,
      assignAllTeamMembers,
      children,
      locations: locations ? this.transformInputTeamLocations(locations) : undefined,
    };

    return teamEventType;
  }

  async getChildEventTypesForManagedEventTypeUpdate(
    eventTypeId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14,
    teamId: number
  ) {
    const eventType = await this.teamsEventTypesRepository.getEventTypeByIdWithChildren(eventTypeId);
    if (!eventType || eventType.schedulingType !== "MANAGED") {
      return undefined;
    }

    const ownersIds = await this.getOwnersIdsForManagedEventTypeUpdate(teamId, inputEventType, eventType);
    const owners = await this.getOwnersForManagedEventType(ownersIds);

    return owners.map((owner) => {
      return {
        hidden: false,
        owner,
      };
    });
  }

  async getOwnersIdsForManagedEventTypeUpdate(
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14,
    eventType: { children: { userId: number | null }[] }
  ) {
    if (inputEventType.assignAllTeamMembers) {
      return await this.getTeamUsersIds(teamId);
    }

    if (inputEventType.hosts) {
      return inputEventType.hosts.map((host) => host.userId);
    }

    // note(Lauris): when API user DOES NOT update managed event type users, but we still need existing managed event type users to know which event-types to update
    // e.g if managed event type title is changed then all children managed event types should be updated as well.
    const childrenOwnersIds: number[] = [];
    for (const child of eventType.children) {
      if (child.userId) {
        childrenOwnersIds.push(child.userId);
      }
    }
    return childrenOwnersIds;
  }

  async getChildEventTypesForManagedEventTypeCreate(
    inputEventType: UpdateTeamEventTypeInput_2024_06_14,
    teamId: number
  ) {
    const ownersIds = await this.getOwnersIdsForManagedEventTypeCreate(teamId, inputEventType);
    const owners = await this.getOwnersForManagedEventType(ownersIds);

    return owners.map((owner) => {
      return {
        hidden: false,
        owner,
      };
    });
  }

  async getOwnersIdsForManagedEventTypeCreate(
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14
  ) {
    if (inputEventType.assignAllTeamMembers) {
      return await this.getTeamUsersIds(teamId);
    }

    if (inputEventType.hosts) {
      return inputEventType.hosts.map((host) => host.userId);
    }

    return [];
  }

  async getTeamUsersIds(teamId: number) {
    const team = await this.teamsRepository.getById(teamId);
    const isPlatformTeam = !!team?.createdByOAuthClientId;
    if (isPlatformTeam) {
      // note(Lauris): platform team creators have role "OWNER" but we don't want to assign them to team members marked as "assignAllTeamMembers: true"
      // because they are not a managed user.
      return await this.teamsRepository.getTeamManagedUsersIds(teamId);
    }
    return await this.teamsRepository.getTeamUsersIds(teamId);
  }

  transformInputTeamLocations(inputLocations: CreateTeamEventTypeInput_2024_06_14["locations"]) {
    return transformTeamLocationsApiToInternal(inputLocations);
  }

  async getOwnersForManagedEventType(userIds: number[]) {
    const users = userIds.length ? await this.usersRepository.findByIdsWithEventTypes(userIds) : [];

    return users.map((user) => {
      const nonManagedEventTypes = user.eventTypes.filter((eventType) => !eventType.parentId);
      return {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        // note(Lauris): managed event types slugs have to be excluded otherwise checkExistentEventTypes within handleChildrenEventTypes.ts will incorrectly delete managed user event type.
        eventTypeSlugs: nonManagedEventTypes.map((eventType) => eventType.slug),
      };
    });
  }

  async getAllTeamMembers(teamId: number, schedulingType: SchedulingType | null) {
    const membersIds = await this.getTeamUsersIds(teamId);
    const isFixed = schedulingType === "COLLECTIVE" ? true : false;

    return membersIds.map((id) => ({
      userId: id,
      isFixed,
      priority: 2,
    }));
  }

  transformInputHosts(
    inputHosts: CreateTeamEventTypeInput_2024_06_14["hosts"] | undefined,
    schedulingType: SchedulingType | null
  ) {
    if (!inputHosts) {
      return undefined;
    }

    const defaultPriority = "medium";
    const defaultIsFixed = false;

    return inputHosts.map((host) => ({
      userId: host.userId,
      isFixed: schedulingType === "COLLECTIVE" ? true : host.mandatory || defaultIsFixed,
      priority: getPriorityValue(
        schedulingType === "COLLECTIVE" ? "medium" : host.priority || defaultPriority
      ),
    }));
  }

  async validateHosts(teamId: number, hosts: CreateTeamEventTypeInput_2024_06_14["hosts"] | undefined) {
    if (hosts && hosts.length) {
      const membersIds = await this.getTeamUsersIds(teamId);
      const invalidHosts = hosts.filter((host) => !membersIds.includes(host.userId));
      if (invalidHosts.length) {
        throw new NotFoundException(
          `Invalid hosts: ${invalidHosts
            .map((host) => host.userId)
            .join(", ")} are not members of team with id ${teamId}.`
        );
      }
    }
  }

  async validateInputLocations(
    teamId: number,
    inputLocations?: CreateTeamEventTypeInput_2024_06_14["locations"]
  ) {
    await Promise.all(
      inputLocations?.map(async (location) => {
        if (location.type === "integration") {
          // cal-video is global, so we can skip this check
          if (location.integration !== "cal-video") {
            await this.conferencingService.checkAppIsValidAndConnected(teamId, location.integration);
          }
        }
      }) ?? []
    );
  }

  async checkAppIsValidAndConnected(teamId: number, app: string) {
    const conferencingApps = ["google-meet", "office365-video", "zoom"];
    if (!conferencingApps.includes(app)) {
      throw new BadRequestException("Invalid app, available apps are: ", conferencingApps.join(", "));
    }
    if (app === "office365-video") {
      app = "msteams";
    }
    const credential = await this.conferencingRepository.findTeamConferencingApp(teamId, app);

    if (!credential) {
      throw new BadRequestException(`${app} not connected.`);
    }
    return credential;
  }
}

function getPriorityValue(priority: keyof typeof HostPriority): number {
  switch (priority) {
    case "lowest":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "highest":
      return 4;
    default:
      throw new Error("Invalid HostPriority label");
  }
}
