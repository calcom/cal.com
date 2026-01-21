import { enrichHostsWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import type { LuckyUserService, RoutingFormResponse } from "@calcom/features/bookings/lib/getLuckyUser";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import type { getEventTypeResponse } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { groupHostsByGroupId } from "@calcom/lib/bookings/hostGroupUtils";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { CalendarFetchMode } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import type { Logger } from "tslog";
import type { BookingType } from "../../handleNewBooking/originalRescheduledBookingUtils";

export interface AvailabilityParams {
  dateFrom: string;
  dateTo: string;
  timeZone: string;
  originalRescheduledBooking?: BookingType;
}

export interface AvailabilityUsers {
  qualifiedRRUsers: IsFixedAwareUser[];
  additionalFallbackRRUsers: IsFixedAwareUser[];
  fixedUsers: IsFixedAwareUser[];
}

export interface AvailabilityResult {
  organizerUser: IsFixedAwareUser;
  luckyUsers: IsFixedAwareUser[];
  allSelectedUsers: IsFixedAwareUser[];
  fixedUserPool: IsFixedAwareUser[];
  notAvailableLuckyUsers: IsFixedAwareUser[];
}

export interface IAvailabilityCalculatorDeps {
  luckyUserService: LuckyUserService;
  logger: Logger<unknown>;
}

interface RRHost {
  user: {
    id: number;
    email: string;
    credentials: CredentialForCalendarService[];
    userLevelSelectedCalendars: SelectedCalendar[];
  };
  createdAt: Date;
  weight?: number | null;
}

type EnrichedHost = {
  isFixed: boolean;
  userId: number;
  createdAt?: Date;
  priority?: number | null;
  weight?: number | null;
  groupId?: string | null;
  user: {
    id: number;
    email: string;
    credentials: CredentialForCalendarService[];
    userLevelSelectedCalendars: SelectedCalendar[];
  };
};

type EventTypeForAvailability = NonNullable<getEventTypeResponse> & {
  hosts: Array<{
    isFixed: boolean;
    userId: number;
    createdAt?: Date;
    priority?: number | null;
    weight?: number | null;
    groupId?: string | null;
    user: {
      id: number;
      email: string;
      credentials: { id: number; type: string; userId: number | null; teamId: number | null; appId: string | null }[];
      userLevelSelectedCalendars: SelectedCalendar[];
    };
  }>;
  hostGroups?: Array<{ groupId: string; name: string }> | null;
};

function assertNonEmptyArray<T>(arr: T[]): asserts arr is [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error("Expected non-empty array");
  }
}

export class AvailabilityCalculator {
  private availableUsers: IsFixedAwareUser[] = [];
  private fixedUserPool: IsFixedAwareUser[] = [];
  private nonFixedUsers: IsFixedAwareUser[] = [];
  private luckyUsers: IsFixedAwareUser[] = [];
  private notAvailableLuckyUsers: IsFixedAwareUser[] = [];
  private enrichedHosts: EnrichedHost[] = [];

  constructor(
    private readonly eventType: EventTypeForAvailability,
    private readonly users: AvailabilityUsers,
    private readonly deps: IAvailabilityCalculatorDeps
  ) {}

  async calculate(
    params: AvailabilityParams,
    options: {
      skipAvailabilityCheck?: boolean;
      calendarFetchMode?: CalendarFetchMode;
      routingFormResponse?: RoutingFormResponse | null;
      teamMemberEmail?: string;
      orgId?: number | null;
    } = {}
  ): Promise<AvailabilityResult> {
    const { skipAvailabilityCheck, calendarFetchMode, routingFormResponse, teamMemberEmail, orgId } = options;

    await this.checkUserAvailability(params, skipAvailabilityCheck, calendarFetchMode);
    this.separateFixedAndNonFixedUsers();
    await this.enrichHostCredentials(orgId ?? null);
    await this.selectLuckyUsers(params, routingFormResponse);
    this.validateUsersAvailable();

    const allSelectedUsers = [...this.fixedUserPool, ...this.luckyUsers];
    const organizerUser = this.determineOrganizer(allSelectedUsers, teamMemberEmail);

    return {
      organizerUser,
      luckyUsers: this.luckyUsers,
      allSelectedUsers,
      fixedUserPool: this.fixedUserPool,
      notAvailableLuckyUsers: this.notAvailableLuckyUsers,
    };
  }

  private async checkUserAvailability(
    params: AvailabilityParams,
    skipAvailabilityCheck?: boolean,
    calendarFetchMode?: CalendarFetchMode
  ): Promise<void> {
    const { qualifiedRRUsers, additionalFallbackRRUsers, fixedUsers } = this.users;

    const eventTypeWithUsers = {
      ...this.eventType,
      users: [...qualifiedRRUsers, ...fixedUsers] as IsFixedAwareUser[],
    };

    if (skipAvailabilityCheck) {
      this.availableUsers = [...qualifiedRRUsers, ...fixedUsers] as IsFixedAwareUser[];
      return;
    }

    try {
      this.availableUsers = await ensureAvailableUsers(
        eventTypeWithUsers,
        params,
        this.deps.logger,
        calendarFetchMode
      );
    } catch (error) {
      if (additionalFallbackRRUsers.length > 0) {
        this.deps.logger.debug("Qualified users unavailable, trying fallback users");
        const fallbackEventType = {
          ...this.eventType,
          users: [...additionalFallbackRRUsers, ...fixedUsers] as IsFixedAwareUser[],
        };
        this.availableUsers = await ensureAvailableUsers(
          fallbackEventType,
          params,
          this.deps.logger,
          calendarFetchMode
        );
      } else {
        throw error;
      }
    }
  }

  private separateFixedAndNonFixedUsers(): void {
    this.fixedUserPool = [];
    this.nonFixedUsers = [];

    this.availableUsers.forEach((user) => {
      if (user.isFixed) {
        this.fixedUserPool.push(user);
      } else {
        this.nonFixedUsers.push(user);
      }
    });
  }

  private async enrichHostCredentials(orgId: number | null): Promise<void> {
    this.enrichedHosts = (await enrichHostsWithDelegationCredentials({
      orgId,
      hosts: this.eventType.hosts,
    })) as EnrichedHost[];
  }

  private async selectLuckyUsers(
    params: AvailabilityParams,
    routingFormResponse?: RoutingFormResponse | null
  ): Promise<void> {
    const luckyUserPools = groupHostsByGroupId({
      hosts: this.nonFixedUsers,
      hostGroups: this.eventType.hostGroups ?? [],
    });

    this.deps.logger.debug(
      "Computed available users",
      safeStringify({
        availableUsers: this.availableUsers.map((user) => user.id),
        luckyUserPools: Object.fromEntries(
          Object.entries(luckyUserPools).map(([groupId, users]) => [groupId, users.map((user) => user.id)])
        ),
      })
    );

    this.luckyUsers = [];
    this.notAvailableLuckyUsers = [];

    for (const [groupId, luckyUserPool] of Object.entries(luckyUserPools)) {
      let luckUserFound = false;

      while (luckyUserPool.length > 0 && !luckUserFound) {
        const freeUsers = luckyUserPool.filter(
          (user) =>
            !this.luckyUsers.concat(this.notAvailableLuckyUsers).find((existing) => existing.id === user.id)
        );

        if (freeUsers.length === 0) break;

        assertNonEmptyArray(freeUsers);

        const allRRHosts = this.buildAllRRHosts(groupId);

        const newLuckyUser = await this.deps.luckyUserService.getLuckyUser({
          availableUsers: freeUsers,
          allRRHosts,
          eventType: {
            id: this.eventType.id,
            isRRWeightsEnabled: this.eventType.isRRWeightsEnabled,
            team: this.eventType.team,
            includeNoShowInRRCalculation: this.eventType.includeNoShowInRRCalculation ?? false,
          },
          routingFormResponse: routingFormResponse ?? null,
          meetingStartTime: new Date(params.dateFrom),
        });

        this.luckyUsers.push(newLuckyUser);
        luckUserFound = true;
      }
    }
  }

  private buildAllRRHosts(groupId: string): RRHost[] {
    return this.enrichedHosts
      .filter((host) => !host.isFixed && (!host.groupId || host.groupId === groupId))
      .map((host) => ({
        user: {
          id: host.user.id,
          email: host.user.email,
          credentials: host.user.credentials,
          userLevelSelectedCalendars: host.user.userLevelSelectedCalendars,
        },
        createdAt: host.createdAt ?? new Date(),
        weight: host.weight,
      }));
  }

  private validateUsersAvailable(): void {
    const allUsers = [
      ...this.users.qualifiedRRUsers,
      ...this.users.additionalFallbackRRUsers,
      ...this.users.fixedUsers,
    ];
    const requiredFixedUsers = allUsers.filter((user) => user.isFixed);

    if (this.fixedUserPool.length !== requiredFixedUsers.length) {
      throw new ErrorWithCode(
        ErrorCode.FixedHostsUnavailableForBooking,
        "Fixed hosts unavailable for booking"
      );
    }

    const roundRobinHosts = this.eventType.hosts.filter((host) => !host.isFixed);
    const hostGroups = groupHostsByGroupId({
      hosts: roundRobinHosts,
      hostGroups: this.eventType.hostGroups ?? [],
    });

    const nonEmptyHostGroups = Object.fromEntries(
      Object.entries(hostGroups).filter(([, hosts]) => hosts.length > 0)
    );

    const allRRUsers = [...this.users.qualifiedRRUsers, ...this.users.additionalFallbackRRUsers];
    if (allRRUsers.length > 0 && this.luckyUsers.length !== (Object.keys(nonEmptyHostGroups).length || 1)) {
      throw new ErrorWithCode(
        ErrorCode.RoundRobinHostsUnavailableForBooking,
        "Round robin hosts unavailable for booking"
      );
    }
  }

  private determineOrganizer(
    allSelectedUsers: IsFixedAwareUser[],
    teamMemberEmail?: string
  ): IsFixedAwareUser {
    if (teamMemberEmail) {
      const requestedUser = allSelectedUsers.find((user) => user.email === teamMemberEmail);
      if (requestedUser) {
        return requestedUser;
      }
    }

    if (allSelectedUsers.length === 0) {
      throw new ErrorWithCode(ErrorCode.NoAvailableUsersFound, "No available users found");
    }

    return allSelectedUsers[0];
  }
}
