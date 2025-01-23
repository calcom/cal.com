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

  const hostsAfterContactOwnerMatching = applyFilterWithFallback(
    roundRobinHosts,
    roundRobinHosts.filter((host) => host.user.email === contactOwnerEmail)
  );

  if (hostsAfterContactOwnerMatching.length === 1) {
    // push all disqualified hosts into fallback, contact owner is recoverable
    const fallbackHosts = getFallbackHosts(
      fixedHosts,
      roundRobinHosts,
      hostsAfterContactOwnerMatching,
      "NotContactOwner"
    );

    return {
      qualifiedHosts: [...fixedHosts, ...hostsAfterContactOwnerMatching],
      fallbackHosts,
    };
  }

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
    // push all disqualified hosts into fallback, reschedule with same user is recoverable
    const fallbackHosts = getFallbackHosts(
      fixedHosts,
      roundRobinHosts,
      hostsAfterRescheduleWithSameRoundRobinHost,
      "NotSameRoundRobinHost"
    );
    return {
      qualifiedHosts: [...fixedHosts, ...hostsAfterRescheduleWithSameRoundRobinHost],
      fallbackHosts,
    };
  }

  const hostsAfterSegmentMatching = applyFilterWithFallback(
    hostsAfterRescheduleWithSameRoundRobinHost,
    (await findMatchingHostsWithEventSegment({
      eventType,
      hosts: hostsAfterRescheduleWithSameRoundRobinHost,
    })) as typeof roundRobinHosts
  );

  if (hostsAfterSegmentMatching.length === 1) {
    return {
      qualifiedHosts: [...fixedHosts, ...hostsAfterContactOwnerMatching],
    };
  }

  const hostsAfterRoutedTeamMemberIdsMatching = applyFilterWithFallback(
    hostsAfterSegmentMatching,
    hostsAfterSegmentMatching.filter((host) => routedTeamMemberIds.includes(host.user.id))
  );

  if (hostsAfterRoutedTeamMemberIdsMatching.length === 1) {
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

  // finally, return all qualified hosts.
  return {
    qualifiedHosts: [...fixedHosts, ...hostsAfterFairnessMatching],
    fallbackHosts,
  };
};
