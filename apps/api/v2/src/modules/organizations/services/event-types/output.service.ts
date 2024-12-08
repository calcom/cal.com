import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import type { EventType, User, Schedule, Host, DestinationCalendar } from "@prisma/client";
import { SchedulingType, Team } from "@prisma/client";

import { HostPriority, TeamEventTypeResponseHost } from "@calcom/platform-types";

type EventTypeRelations = {
  users: User[];
  schedule: Schedule | null;
  hosts: Host[];
  destinationCalendar?: DestinationCalendar | null;
  team?: Pick<Team, "bannerUrl"> | null;
};
export type DatabaseTeamEventType = EventType & EventTypeRelations;

type Input = Pick<
  DatabaseTeamEventType,
  | "id"
  | "length"
  | "title"
  | "description"
  | "disableGuests"
  | "slotInterval"
  | "minimumBookingNotice"
  | "beforeEventBuffer"
  | "afterEventBuffer"
  | "slug"
  | "schedulingType"
  | "requiresConfirmation"
  | "price"
  | "currency"
  | "lockTimeZoneToggleOnBookingPage"
  | "seatsPerTimeSlot"
  | "forwardParamsSuccessRedirect"
  | "successRedirectUrl"
  | "seatsShowAvailabilityCount"
  | "isInstantEvent"
  | "locations"
  | "bookingFields"
  | "recurringEvent"
  | "metadata"
  | "users"
  | "scheduleId"
  | "hosts"
  | "teamId"
  | "userId"
  | "parentId"
  | "assignAllTeamMembers"
  | "bookingLimits"
  | "durationLimits"
  | "onlyShowFirstAvailableSlot"
  | "offsetStart"
  | "periodType"
  | "periodDays"
  | "periodCountCalendarDays"
  | "periodStartDate"
  | "periodEndDate"
  | "requiresBookerEmailVerification"
  | "hideCalendarNotes"
  | "lockTimeZoneToggleOnBookingPage"
  | "eventTypeColor"
  | "seatsShowAttendees"
  | "requiresConfirmationWillBlockSlot"
  | "eventName"
  | "useEventTypeDestinationCalendarEmail"
  | "hideCalendarEventDetails"
  | "team"
>;

@Injectable()
export class OutputOrganizationsEventTypesService {
  constructor(
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14,
    private readonly organizationEventTypesRepository: OrganizationsEventTypesRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async getResponseTeamEventType(databaseEventType: Input) {
    const { teamId, userId, parentId, assignAllTeamMembers } = databaseEventType;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ownerId, users, ...rest } = this.outputEventTypesService.getResponseEventType(
      0,
      databaseEventType
    );
    const hosts =
      databaseEventType.schedulingType === "MANAGED"
        ? await this.getManagedEventTypeHosts(databaseEventType.id)
        : await this.transformHosts(databaseEventType.hosts, databaseEventType.schedulingType);

    return {
      ...rest,
      hosts,
      teamId,
      ownerId: userId,
      parentEventTypeId: parentId,
      schedulingType: databaseEventType.schedulingType,
      bannerUrl: databaseEventType?.team?.bannerUrl,
      assignAllTeamMembers: teamId ? assignAllTeamMembers : undefined,
    };
  }

  async getManagedEventTypeHosts(eventTypeId: number) {
    const children = await this.organizationEventTypesRepository.getEventTypeChildren(eventTypeId);
    const transformedHosts: TeamEventTypeResponseHost[] = [];
    for (const child of children) {
      if (child.userId) {
        const user = await this.usersRepository.findById(child.userId);
        transformedHosts.push({ userId: child.userId, name: user?.name || "" });
      }
    }
    return transformedHosts;
  }

  async transformHosts(
    databaseHosts: Host[],
    schedulingType: SchedulingType | null
  ): Promise<TeamEventTypeResponseHost[]> {
    if (!schedulingType) return [];

    const transformedHosts: TeamEventTypeResponseHost[] = [];
    const databaseUsers = await this.usersRepository.findByIds(databaseHosts.map((host) => host.userId));

    for (const databaseHost of databaseHosts) {
      const databaseUser = databaseUsers.find((u) => u.id === databaseHost.userId);
      if (schedulingType === "ROUND_ROBIN") {
        // note(Lauris): round robin is the only team event where mandatory (isFixed) and priority are used
        transformedHosts.push({
          userId: databaseHost.userId,
          name: databaseUser?.name || "",
          mandatory: databaseHost.isFixed,
          priority: getPriorityLabel(databaseHost.priority || 2),
          avatarUrl: databaseUser?.avatarUrl,
        });
      } else {
        transformedHosts.push({
          userId: databaseHost.userId,
          name: databaseUser?.name || "",
          avatarUrl: databaseUser?.avatarUrl,
        });
      }
    }

    return transformedHosts;
  }
}

function getPriorityLabel(priority: number): keyof typeof HostPriority {
  switch (priority) {
    case 0:
      return "lowest";
    case 1:
      return "low";
    case 2:
      return "medium";
    case 3:
      return "high";
    case 4:
      return "highest";
    default:
      throw new Error("Invalid HostPriority value");
  }
}
