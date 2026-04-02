import type { RoutingFormResponse } from "@calcom/features/bookings/lib/getLuckyUser";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { EventType } from "@calcom/features/users/lib/getRoutedUsers";
import {
  findMatchingHostsWithEventSegment,
  getNormalizedHostsWithDelegationCredentials,
} from "@calcom/features/users/lib/getRoutedUsers";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";
import type { FilterHostsService } from "./filterHostsBySameRoundRobinHost";

export interface IQualifiedHostsService {
  bookingRepo: BookingRepository;
  filterHostsService: FilterHostsService;
}

type Host<T> = {
  isFixed: boolean;
  createdAt: Date;
  priority?: number | null;
  weight?: number | null;
  groupId: string | null;
} & {
  user: T;
};

// In case we don't have any matching team members, we return all the RR hosts, as we always want the team event to be bookable.
// Each filter is filtered down, but we never return 0-length.
// TODO: We should notify about it to the organizer somehow.
function applyFilterWithFallback<T>(currentValue: T[], newValue: T[]): T[] {
  return newValue.length > 0 ? newValue : currentValue;
}

function getFallBackWithContactOwner<T extends { user: { id: number } }>(
  fallbackHosts: T[],
  contactOwner: T
) {
  if (fallbackHosts.find((host) => host.user.id === contactOwner.user.id)) {
    return fallbackHosts;
  }

  return [...fallbackHosts, contactOwner];
}

const isRoundRobinHost = <T extends { isFixed: boolean }>(host: T): host is T & { isFixed: false } => {
  return host.isFixed === false;
};

const isFixedHost = <T extends { isFixed: boolean }>(host: T): host is T & { isFixed: false } => {
  return host.isFixed;
};

const isWithinRRHostSubset = <T extends { isFixed: boolean; user: { id: number } }>(
  host: T,
  rrHostSubsetIds: number[],
  {
    rrHostSubsetEnabled,
    schedulingType,
  }: { rrHostSubsetEnabled: boolean; schedulingType?: SchedulingType } = {
    rrHostSubsetEnabled: false,
    schedulingType: undefined,
  }
): host is T & { isFixed: false } => {
  if (rrHostSubsetIds.length === 0 || !rrHostSubsetEnabled || schedulingType !== SchedulingType.ROUND_ROBIN) {
    return true;
  }
  return rrHostSubsetIds.includes(host.user.id);
};

export class QualifiedHostsService {
  constructor(public readonly dependencies: IQualifiedHostsService) {}

  async _findQualifiedHostsWithDelegationCredentials<
    T extends {
      email: string;
      id: number;
      uuid: string;
      credentials: CredentialPayload[];
      userLevelSelectedCalendars: SelectedCalendar[];
    } & Record<string, unknown>,
  >({
    eventType,
    rescheduleUid,
    routedTeamMemberIds,
    contactOwnerEmail,
    routingFormResponse,
    rrHostSubsetIds,
  }: {
    eventType: {
      id: number;
      maxLeadThreshold?: number | null;
      hosts?: Host<T>[];
      users: T[];
      schedulingType: SchedulingType | null;
      isRRWeightsEnabled: boolean;
      rescheduleWithSameRoundRobinHost: boolean;
      includeNoShowInRRCalculation: boolean;
      rrHostSubsetEnabled?: boolean;
    } & EventType;
    rescheduleUid: string | null;
    routedTeamMemberIds: number[];
    contactOwnerEmail: string | null;
    routingFormResponse: RoutingFormResponse | null;
    rrHostSubsetIds?: number[];
  }): Promise<{
    qualifiedRRHosts: {
      isFixed: boolean;
      createdAt: Date | null;
      priority?: number | null;
      weight?: number | null;
      user: Omit<T, "credentials"> & { credentials: CredentialForCalendarService[] };
    }[];
    fixedHosts: {
      isFixed: boolean;
      createdAt: Date | null;
      priority?: number | null;
      weight?: number | null;
      user: Omit<T, "credentials"> & { credentials: CredentialForCalendarService[] };
    }[];
    // all hosts we want to fallback to including the qualifiedRRHosts (fairness + crm contact owner)
    allFallbackRRHosts?: {
      isFixed: boolean;
      createdAt: Date | null;
      priority?: number | null;
      weight?: number | null;
      user: Omit<T, "credentials"> & { credentials: CredentialForCalendarService[] };
    }[];
  }> {
    const { hosts: normalizedHosts, fallbackHosts: fallbackUsers } =
      await getNormalizedHostsWithDelegationCredentials({
        eventType,
      });
    // not a team event type, or some other reason - segment matching isn't necessary.
    if (!normalizedHosts) {
      const fixedHosts = fallbackUsers.filter(isFixedHost);
      const roundRobinHosts = fallbackUsers.filter(isRoundRobinHost);
      return { qualifiedRRHosts: roundRobinHosts, fixedHosts };
    }

    const fixedHosts = normalizedHosts.filter(isFixedHost).filter((host) =>
      isWithinRRHostSubset(host, rrHostSubsetIds ?? [], {
        rrHostSubsetEnabled: eventType.rrHostSubsetEnabled ?? false,
        schedulingType: eventType.schedulingType ?? undefined,
      })
    );
    const roundRobinHosts = normalizedHosts.filter(isRoundRobinHost).filter((host) =>
      isWithinRRHostSubset(host, rrHostSubsetIds ?? [], {
        rrHostSubsetEnabled: eventType.rrHostSubsetEnabled ?? false,
        schedulingType: eventType.schedulingType ?? undefined,
      })
    );

    // If it is rerouting, we should not force reschedule with same host.
    const hostsAfterRescheduleWithSameRoundRobinHost = applyFilterWithFallback(
      roundRobinHosts,
      await this.dependencies.filterHostsService.filterHostsBySameRoundRobinHost({
        hosts: roundRobinHosts,
        rescheduleUid,
        rescheduleWithSameRoundRobinHost: eventType.rescheduleWithSameRoundRobinHost,
        routedTeamMemberIds,
      })
    );

    if (hostsAfterRescheduleWithSameRoundRobinHost.length === 1) {
      return {
        qualifiedRRHosts: hostsAfterRescheduleWithSameRoundRobinHost,
        fixedHosts,
      };
    }

    const hostsAfterSegmentMatching = applyFilterWithFallback(
      hostsAfterRescheduleWithSameRoundRobinHost,
      (await findMatchingHostsWithEventSegment({
        eventType,
        hosts: hostsAfterRescheduleWithSameRoundRobinHost,
      })) as typeof hostsAfterRescheduleWithSameRoundRobinHost
    );

    if (hostsAfterSegmentMatching.length === 1) {
      return {
        qualifiedRRHosts: hostsAfterSegmentMatching,
        fixedHosts,
      };
    }

    //if segment matching doesn't return any hosts we fall back to all round robin hosts
    const officalRRHosts = hostsAfterSegmentMatching.length
      ? hostsAfterSegmentMatching
      : hostsAfterRescheduleWithSameRoundRobinHost;

    const hostsAfterContactOwnerMatching = applyFilterWithFallback(
      officalRRHosts,
      officalRRHosts.filter((host) => host.user.email === contactOwnerEmail)
    );

    const hostsAfterRoutedTeamMemberIdsMatching = applyFilterWithFallback(
      officalRRHosts,
      officalRRHosts.filter((host) => routedTeamMemberIds.includes(host.user.id))
    );

    if (hostsAfterRoutedTeamMemberIdsMatching.length === 1) {
      if (hostsAfterContactOwnerMatching.length === 1) {
        return {
          qualifiedRRHosts: hostsAfterContactOwnerMatching,
          allFallbackRRHosts: getFallBackWithContactOwner(
            hostsAfterRoutedTeamMemberIdsMatching,
            hostsAfterContactOwnerMatching[0]
          ),
          fixedHosts,
        };
      }
      return {
        qualifiedRRHosts: hostsAfterRoutedTeamMemberIdsMatching,
        fixedHosts,
      };
    }

    const hostsAfterFairnessMatching = applyFilterWithFallback(
      hostsAfterRoutedTeamMemberIdsMatching,
      await filterHostsByLeadThreshold({
        eventType,
        hosts: hostsAfterRoutedTeamMemberIdsMatching,
        maxLeadThreshold: eventType.maxLeadThreshold ?? null,
        routingFormResponse,
      })
    );

    if (hostsAfterContactOwnerMatching.length === 1) {
      return {
        qualifiedRRHosts: hostsAfterContactOwnerMatching,
        allFallbackRRHosts: getFallBackWithContactOwner(
          hostsAfterFairnessMatching,
          hostsAfterContactOwnerMatching[0]
        ),
        fixedHosts,
      };
    }

    return {
      qualifiedRRHosts: hostsAfterFairnessMatching,
      // only if fairness filtering is active
      allFallbackRRHosts:
        hostsAfterFairnessMatching.length !== hostsAfterRoutedTeamMemberIdsMatching.length
          ? hostsAfterRoutedTeamMemberIdsMatching
          : undefined,
      fixedHosts,
    };
  }

  findQualifiedHostsWithDelegationCredentials = withReporting(
    this._findQualifiedHostsWithDelegationCredentials.bind(this),
    "findQualifiedHostsWithDelegationCredentials"
  );
}
