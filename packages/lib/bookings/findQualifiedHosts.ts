import { findMatchingHostsWithEventSegment, getNormalizedHosts } from "@calcom/lib/bookings/getRoutedUsers";
import type { EventType } from "@calcom/lib/bookings/getRoutedUsers";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { CredentialPayload } from "@calcom/types/Credential";

import type { RoutingFormResponse } from "../server/getLuckyUser";
import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";
import { filterHostsBySameRoundRobinHost } from "./filterHostsBySameRoundRobinHost";

type Host<T> = {
  isFixed: boolean;
  createdAt: Date;
  priority?: number | null;
  weight?: number | null;
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

export const findQualifiedHosts = async <
  T extends {
    email: string;
    id: number;
    credentials: CredentialPayload[];
    userLevelSelectedCalendars: SelectedCalendar[];
  } & Record<string, unknown>
>({
  eventType,
  rescheduleUid,
  routedTeamMemberIds,
  contactOwnerEmail,
  routingFormResponse,
}: {
  eventType: {
    id: number;
    maxLeadThreshold: number | null;
    hosts?: Host<T>[];
    users: T[];
    schedulingType: SchedulingType | null;
    isRRWeightsEnabled: boolean;
    rescheduleWithSameRoundRobinHost: boolean;
  } & EventType;
  rescheduleUid: string | null;
  routedTeamMemberIds: number[];
  contactOwnerEmail: string | null;
  routingFormResponse: RoutingFormResponse | null;
}): Promise<{
  qualifiedRRHosts: {
    isFixed: boolean;
    createdAt: Date | null;
    priority?: number | null;
    weight?: number | null;
    user: T;
  }[];
  fixedHosts: {
    isFixed: boolean;
    createdAt: Date | null;
    priority?: number | null;
    weight?: number | null;
    user: T;
  }[];
  // all hosts we want to fallback to including the qualifiedRRHosts (fairness + crm contact owner)
  allFallbackRRHosts?: {
    isFixed: boolean;
    createdAt: Date | null;
    priority?: number | null;
    weight?: number | null;
    user: T;
  }[];
}> => {
  const { hosts: normalizedHosts, fallbackHosts: fallbackUsers } = getNormalizedHosts({ eventType });
  // not a team event type, or some other reason - segment matching isn't necessary.
  if (!normalizedHosts) {
    const fixedHosts = fallbackUsers.filter(isFixedHost);
    const roundRobinHosts = fallbackUsers.filter(isRoundRobinHost);
    return { qualifiedRRHosts: roundRobinHosts, fixedHosts };
  }

  const fixedHosts = normalizedHosts.filter(isFixedHost);
  const roundRobinHosts = normalizedHosts.filter(isRoundRobinHost);

  // If it is rerouting, we should not force reschedule with same host.
  const hostsAfterRescheduleWithSameRoundRobinHost = applyFilterWithFallback(
    roundRobinHosts,
    await filterHostsBySameRoundRobinHost({
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
    roundRobinHosts,
    (await findMatchingHostsWithEventSegment({
      eventType,
      hosts: roundRobinHosts,
    })) as typeof roundRobinHosts
  );

  if (hostsAfterSegmentMatching.length === 1) {
    return {
      qualifiedRRHosts: hostsAfterSegmentMatching,
      fixedHosts,
    };
  }

  //if segement matching doesn't return any hosts we fall back to all round robin hosts
  const officalRRHosts = hostsAfterSegmentMatching.length ? hostsAfterSegmentMatching : roundRobinHosts;

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
      maxLeadThreshold: eventType.maxLeadThreshold,
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
};
