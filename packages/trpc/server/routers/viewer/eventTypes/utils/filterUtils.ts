import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import type { TEventTypeInputSchema } from "../getByViewer.schema";

type FiltersType = NonNullable<TEventTypeInputSchema>["filters"];

export interface FilterContext {
  filters?: FiltersType;
  userUpId: string;
}

export function shouldListUserEvents(context: FilterContext): boolean {
  const { filters, userUpId } = context;
  const isFilterSet = filters && hasFilter(filters);
  const isUpIdInFilter = filters?.upIds?.includes(userUpId) ?? false;

  let shouldList = !isFilterSet || isUpIdInFilter;

  if (isFilterSet && filters?.upIds && !isUpIdInFilter) {
    shouldList = true;
  }

  return shouldList;
}

export function shouldIncludeTeamMembership(
  membership: { team: { id: number } },
  filters?: FiltersType
): boolean {
  if (!filters || !hasFilter(filters)) {
    return true;
  }

  return filters?.teamIds?.includes(membership.team.id) ?? false;
}

export function createTeamSlug(
  teamSlug: string | null,
  hasParent: boolean,
  forRoutingForms: boolean
): string | null {
  if (!teamSlug) return null;

  if (forRoutingForms) {
    return `team/${teamSlug}`;
  }

  return hasParent ? teamSlug : `team/${teamSlug}`;
}
