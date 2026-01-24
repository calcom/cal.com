import type { ActiveFilter, ActiveFilters, ActiveFiltersValidator } from "@calcom/features/data-table";
import { ColumnFilterType } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { useCallback, useMemo } from "react";

import { useEventTypes } from "./useEventTypes";

interface UseActiveFiltersValidatorOptions {
  canReadOthersBookings: boolean;
}

export interface AccessibleResources {
  userIds: number[];
  eventTypeIds: number[];
  teamIds: number[];
}

export function createActiveFiltersValidator(accessibleResources: AccessibleResources) {
  const { userIds, eventTypeIds, teamIds } = accessibleResources;

  return function validateActiveFilters(filters: ActiveFilters): ActiveFilters {
    return filters
      .map((filter): ActiveFilter | null => {
        if (filter.f === "userId" && filter.v) {
          if (filter.v.type === ColumnFilterType.MULTI_SELECT) {
            const validIds = filter.v.data.filter((id) => userIds.includes(id as number));
            if (validIds.length === 0) {
              return null;
            }
            return { ...filter, v: { ...filter.v, data: validIds } };
          }
          if (filter.v.type === ColumnFilterType.SINGLE_SELECT) {
            if (!userIds.includes(filter.v.data as number)) {
              return null;
            }
          }
        }

        if (filter.f === "eventTypeId" && filter.v) {
          if (filter.v.type === ColumnFilterType.MULTI_SELECT) {
            const validIds = filter.v.data.filter((id) => eventTypeIds.includes(id as number));
            if (validIds.length === 0) {
              return null;
            }
            return { ...filter, v: { ...filter.v, data: validIds } };
          }
          if (filter.v.type === ColumnFilterType.SINGLE_SELECT) {
            if (!eventTypeIds.includes(filter.v.data as number)) {
              return null;
            }
          }
        }

        if (filter.f === "teamId" && filter.v) {
          if (filter.v.type === ColumnFilterType.MULTI_SELECT) {
            const validIds = filter.v.data.filter((id) => teamIds.includes(id as number));
            if (validIds.length === 0) {
              return null;
            }
            return { ...filter, v: { ...filter.v, data: validIds } };
          }
          if (filter.v.type === ColumnFilterType.SINGLE_SELECT) {
            if (!teamIds.includes(filter.v.data as number)) {
              return null;
            }
          }
        }

        return filter;
      })
      .filter((f): f is ActiveFilter => f !== null);
  };
}

export function useActiveFiltersValidator({
  canReadOthersBookings,
}: UseActiveFiltersValidatorOptions): ActiveFiltersValidator | undefined {
  const eventTypes = useEventTypes();
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { data: members } = trpc.viewer.teams.listSimpleMembers.useQuery(undefined, {
    enabled: canReadOthersBookings,
  });
  const { data: currentUser } = useMeQuery();

  const accessibleUserIds = useMemo(() => {
    if (!canReadOthersBookings) {
      return currentUser ? [currentUser.id] : [];
    }
    return members?.map((m) => m.id) ?? [];
  }, [canReadOthersBookings, currentUser, members]);

  const accessibleEventTypeIds = useMemo(() => {
    return eventTypes?.map((et) => et.value) ?? [];
  }, [eventTypes]);

  const accessibleTeamIds = useMemo(() => {
    return teams?.map((t) => t.id) ?? [];
  }, [teams]);

  const isDataLoaded = useMemo(() => {
    if (!canReadOthersBookings) {
      return currentUser !== undefined && eventTypes !== undefined && teams !== undefined;
    }
    return members !== undefined && eventTypes !== undefined && teams !== undefined;
  }, [canReadOthersBookings, currentUser, members, eventTypes, teams]);

  const validateActiveFilters = useCallback(
    (filters: ActiveFilters): ActiveFilters => {
      return createActiveFiltersValidator({
        userIds: accessibleUserIds,
        eventTypeIds: accessibleEventTypeIds,
        teamIds: accessibleTeamIds,
      })(filters);
    },
    [accessibleUserIds, accessibleEventTypeIds, accessibleTeamIds]
  );

  if (!isDataLoaded) {
    return undefined;
  }

  return validateActiveFilters;
}
