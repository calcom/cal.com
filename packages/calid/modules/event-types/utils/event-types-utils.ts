import type { InfiniteEventType, InfiniteEventTypeGroup } from "../types/event-types";

/**
 * Build event URL based on team structure
 */
export const buildEventUrl = (currentTeam: InfiniteEventTypeGroup | undefined, eventSlug: string): string => {
  if (currentTeam?.teamId) {
    return `/${currentTeam.profile.slug}/${eventSlug}`;
  }
  return `/${currentTeam?.profile.slug}/${eventSlug}`;
};

/**
 * Build public team URL
 */
export const buildPublicTeamUrl = (
  currentTeam: InfiniteEventTypeGroup | undefined,
  bookerUrl: string
): string => {
  return currentTeam?.teamId
    ? `${bookerUrl}/${currentTeam?.profile.slug}`
    : `${bookerUrl}/${currentTeam?.profile.slug}`;
};

/**
 * Filter events by search term
 */
export const filterEventsBySearch = (
  events: InfiniteEventType[],
  searchTerm: string
): InfiniteEventType[] => {
  if (!searchTerm) return events;

  const lowerSearchTerm = searchTerm.toLowerCase();
  return events.filter(
    (event) =>
      event.title.toLowerCase().includes(lowerSearchTerm) ||
      event.description?.toLowerCase().includes(lowerSearchTerm)
  );
};

/**
 * Initialize event states from event data
 */
export const initializeEventStates = (events: InfiniteEventType[]): { [key: number]: boolean } => {
  const states: { [key: number]: boolean } = {};
  events.forEach((event) => {
    states[event.id] = !event.hidden;
  });
  return states;
};

/**
 * Get event display name with fallback
 */
export const getEventDisplayName = (event: InfiniteEventType): string => {
  return event.title || "Untitled Event";
};

/**
 * Check if event is managed type
 */
export const isManagedEventType = (event: InfiniteEventType): boolean => {
  return event.schedulingType === "MANAGED";
};

/**
 * Check if event is children of managed type
 */
export const isChildrenManagedEventType = (event: InfiniteEventType): boolean => {
  return event.metadata?.managedEventConfig !== undefined && event.schedulingType !== "MANAGED";
};

/**
 * Get team member initials
 */
export const getTeamMemberInitials = (user: any): string => {
  return user.name?.[0] || user.email?.[0] || "U";
};

/**
 * Build duplicate event URL params
 */
export const buildDuplicateEventParams = (
  event: InfiniteEventType,
  group: InfiniteEventTypeGroup
): URLSearchParams => {
  const searchParams = new URLSearchParams();
  searchParams.set("dialog", "duplicate");
  searchParams.set("title", event.title);
  searchParams.set("description", event.description || "");
  searchParams.set("slug", event.slug);
  searchParams.set("id", event.id.toString());
  searchParams.set("length", event.length.toString());
  searchParams.set("pageSlug", group.profile.slug || "");

  if (group.teamId) {
    searchParams.set("teamId", group.teamId.toString());
  }
  if (group.parentId) {
    searchParams.set("parentId", group.parentId.toString());
  }

  return searchParams;
};
