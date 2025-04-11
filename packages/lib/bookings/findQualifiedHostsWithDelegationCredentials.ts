import {
  findMatchingHostsWithEventSegment,
  getNormalizedHostsWithDelegationCredentials,
} from "@calcom/lib/bookings/getRoutedUsers";
import type { EventType } from "@calcom/lib/bookings/getRoutedUsers";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import type { RoutingFormResponse } from "../server/getLuckyUser";
import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";
import { filterHostsBySameRoundRobinHost } from "./filterHostsBySameRoundRobinHost";

type Host<TUser, TIsFixed extends boolean> = {
  isFixed: TIsFixed;
  createdAt: Date;
  priority?: number | null;
  weight?: number | null;
} & {
  user: TUser;
};

type HostWithUserCredentials<TUser, TIsFixed extends boolean> = Omit<
  Host<TUser, TIsFixed>,
  "user" | "createdAt"
> & {
  createdAt: Date | null;
  user: Omit<TUser, "credentials"> & { credentials: CredentialForCalendarService[] };
};

// In case we don't have any matching team members, we return all the RR hosts, as we always want the team event to be bookable.
// Each filter is filtered down, but we never return 0-length.
// TODO: We should notify about it to the organizer somehow.
async function applyFilterWithFallback<T>(
  currentValue: T[] | Promise<T[]>,
  newValue: T[] | Promise<T[]>
): Promise<T[]> {
  const rNewValue = await newValue;
  return rNewValue.length > 0 ? rNewValue : await currentValue;
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

const isFixedHost = <T extends { isFixed: boolean }>(host: T): host is T & { isFixed: true } => {
  return host.isFixed;
};

export const findQualifiedHostsWithDelegationCredentials = async <
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
    hosts?: Host<T, boolean>[];
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
  qualifiedRRHosts: HostWithUserCredentials<T, false>[];
  fixedHosts: HostWithUserCredentials<T, true>[];
  // all hosts we want to fallback to including the qualifiedRRHosts (fairness + crm contact owner)
  allFallbackRRHosts?: HostWithUserCredentials<T, boolean>[] | Promise<HostWithUserCredentials<T, boolean>[]>;
}> => {
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

  const fixedHosts = normalizedHosts.filter(isFixedHost);
  const roundRobinHosts = normalizedHosts.filter(isRoundRobinHost);

  // If it is rerouting, we should not force reschedule with same host.
  const hostsAfterRescheduleWithSameRoundRobinHost = await applyFilterWithFallback(
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

  const hostsAfterSegmentMatching = await applyFilterWithFallback(
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

  const hostsAfterContactOwnerMatching = await applyFilterWithFallback(
    officalRRHosts,
    officalRRHosts.filter((host) => host.user.email === contactOwnerEmail)
  );

  const hostsAfterRoutedTeamMemberIdsMatching = await applyFilterWithFallback(
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

  // problem: We need to have fairness & OOO calibration calculation when contact owner is given
  //          this is however very expensive to calculate, so we promisify it

  const _filterHostsByLeadThreshold = filterHostsByLeadThreshold({
    eventType,
    hosts: hostsAfterRoutedTeamMemberIdsMatching,
    maxLeadThreshold: eventType.maxLeadThreshold,
    routingFormResponse,
  });

  const hostsAfterFairnessMatchingCb =
    hostsAfterContactOwnerMatching.length !== 1
      ? await applyFilterWithFallback(
          hostsAfterRoutedTeamMemberIdsMatching,
          await _filterHostsByLeadThreshold // Ensure it's resolved before passing
        )
      : applyFilterWithFallback(
          hostsAfterRoutedTeamMemberIdsMatching,
          _filterHostsByLeadThreshold // Pass as-is (could be sync or async)
        );

  if (hostsAfterContactOwnerMatching.length === 1) {
    const allFallbackRRHosts =
      hostsAfterContactOwnerMatching.length === 1
        ? getFallBackWithContactOwner(await hostsAfterFairnessMatchingCb, hostsAfterContactOwnerMatching[0])
        : Promise.resolve(
            getFallBackWithContactOwner(await hostsAfterFairnessMatchingCb, hostsAfterContactOwnerMatching[0])
          );
    return {
      qualifiedRRHosts: hostsAfterContactOwnerMatching,
      allFallbackRRHosts,
      fixedHosts,
    };
  }

  const hostsAfterFairnessMatching = await hostsAfterFairnessMatchingCb;

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
