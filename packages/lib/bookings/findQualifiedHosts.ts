import { findMatchingHostsWithEventSegment, getNormalizedHosts } from "@calcom/lib/bookings/getRoutedUsers";
import type { EventType } from "@calcom/lib/bookings/getRoutedUsers";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { CredentialPayload } from "@calcom/types/Credential";

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

type RecoverableDisqualificationReason = "NotSameRoundRobinHost" | "NotContactOwner" | "Unfair";

const getFallbackHosts = <T>(
  fixedHosts: T[],
  oldValue: T[],
  newValue: T[],
  reason: RecoverableDisqualificationReason
) => {
  const fallbackRRHosts = oldValue
    .filter((host) => !newValue.includes(host))
    .map((host) => ({
      ...host,
      disqualifyReason: reason,
    }));
  if (fallbackRRHosts.length > 0) {
    return [...fixedHosts, ...fallbackRRHosts];
  }
  return [];
};

const isRoundRobinHost = <T extends { isFixed: boolean }>(host: T): host is T & { isFixed: false } => {
  return host.isFixed === false;
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
  routingFormResponseId,
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
  routingFormResponseId?: number;
}): Promise<{
  qualifiedHosts: {
    isFixed: boolean;
    createdAt: Date | null;
    priority?: number | null;
    weight?: number | null;
    user: T;
  }[];
  fallbackHosts?: {
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
    return { qualifiedHosts: fallbackUsers };
  }

  const fixedHosts = normalizedHosts.filter((host) => host.isFixed);
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
      qualifiedHosts: [...fixedHosts, ...hostsAfterRescheduleWithSameRoundRobinHost],
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
      qualifiedHosts: [...fixedHosts, ...hostsAfterSegmentMatching],
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
      // push all disqualified hosts into fallback, contact owner is recoverable
      const fallbackHosts = getFallbackHosts(
        fixedHosts,
        hostsAfterRoutedTeamMemberIdsMatching,
        hostsAfterContactOwnerMatching,
        "NotContactOwner"
      );

      return {
        qualifiedHosts: [...fixedHosts, ...hostsAfterContactOwnerMatching],
        fallbackHosts,
      };
    }
    return {
      qualifiedHosts: [...fixedHosts, ...hostsAfterRoutedTeamMemberIdsMatching],
    };
  }

  const hostsAfterFairnessMatching = applyFilterWithFallback(
    hostsAfterRoutedTeamMemberIdsMatching,
    await filterHostsByLeadThreshold({
      eventType,
      hosts: hostsAfterRoutedTeamMemberIdsMatching,
      maxLeadThreshold: eventType.maxLeadThreshold,
    })
  );

  const fallbackHosts: (Omit<(typeof hostsAfterFairnessMatching)[number], "isFixed"> & {
    isFixed: boolean;
  })[] = getFallbackHosts(
    [],
    hostsAfterRoutedTeamMemberIdsMatching.filter(
      (host) =>
        !hostsAfterFairnessMatching.some(
          (fairnessHost) => fairnessHost.user.id === host.user.id // Compare unique identifiers
        )
    ),
    hostsAfterFairnessMatching,
    "Unfair"
  );

  if (fallbackHosts.length > 0) {
    fallbackHosts.unshift(...fixedHosts);
  }

  if (hostsAfterContactOwnerMatching.length === 1) {
    // push all disqualified hosts into fallback, contact owner is recoverable
    const fallbackHosts = getFallbackHosts(
      fixedHosts,
      hostsAfterFairnessMatching,
      hostsAfterContactOwnerMatching,
      "NotContactOwner"
    );

    return {
      qualifiedHosts: [...fixedHosts, ...hostsAfterContactOwnerMatching],
      fallbackHosts,
    };
  }

  return {
    qualifiedHosts: [...fixedHosts, ...hostsAfterFairnessMatching],
    fallbackHosts, // if fairness causes no availability for at least 2 weeks
  };
};
