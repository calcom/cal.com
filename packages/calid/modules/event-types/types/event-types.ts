import type { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";

// Base types from TRPC responses
export type GetUserEventGroupsResponse = RouterOutputs["viewer"]["eventTypes"]["calid_getUserEventGroups"];
export type GetEventTypesFromGroupsResponse =
  RouterOutputs["viewer"]["eventTypes"]["calid_getEventTypesFromGroup"];

export type InfiniteEventTypeGroup = GetUserEventGroupsResponse["eventTypeGroups"][number];
export type InfiniteEventType = GetEventTypesFromGroupsResponse["eventTypes"][number];

// Component prop interfaces
export interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (eventData: any) => void;
  pageSlug?: string;
  urlPrefix?: string;
}

export interface CreateTeamEventModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  teamSlug?: string;
  isTeamAdminOrOwner: boolean;
}

export interface DraggableEventCardProps {
  event: InfiniteEventType;
  selectedTeam: string;
  currentTeam: InfiniteEventTypeGroup;
  isEventActive: boolean;
  copiedLink: string | null;
  bookerUrl: string;
  onEventEdit: (eventId: number) => void;
  onCopyLink: (eventId: number, url: string) => void;
  onToggleEvent: (eventId: number, checked: boolean) => void;
  onDuplicateEvent: (event: InfiniteEventType, group: InfiniteEventTypeGroup) => void;
  onDeleteEvent: (eventId: number) => void;
}

export interface DraggableEventTypesProps {
  events: InfiniteEventType[];
  selectedTeam: string;
  currentTeam: InfiniteEventTypeGroup;
  eventStates: { [key: number]: boolean };
  copiedLink: string | null;
  bookerUrl: string;
  onEventEdit: (eventId: number) => void;
  onCopyLink: (eventId: number, url: string) => void;
  onToggleEvent: (eventId: number, checked: boolean) => void;
  onDuplicateEvent: (event: InfiniteEventType, group: InfiniteEventTypeGroup) => void;
  onDeleteEvent: (eventId: number) => void;
  onReorderEvents: (events: InfiniteEventType[]) => void;
}

export interface TeamTabsProps {
  eventTypeGroups: InfiniteEventTypeGroup[];
  profiles: any[];
  selectedTeam: string;
  onTeamChange: (teamId: string | null) => void;
}

export interface EventTypesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentTeam: InfiniteEventTypeGroup;
  bookerUrl: string;
  copiedPublicLink: boolean;
  onCopyPublicLink: () => void;
  showNewDropdown: boolean;
  onToggleNewDropdown: () => void;
  onNewSelection: (teamId: string) => void;
  eventTypeGroups: InfiniteEventTypeGroup[];
  newDropdownRef: React.RefObject<HTMLDivElement>;
}

export interface EventTypesContentProps {
  isLoading: boolean;
  filteredEvents: InfiniteEventType[];
  selectedTeam: string;
  currentTeam: InfiniteEventTypeGroup;
  eventStates: { [key: number]: boolean };
  copiedLink: string | null;
  bookerUrl: string;
  debouncedSearchTerm: string;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onEventEdit: (eventId: number) => void;
  onCopyLink: (eventId: number, url: string) => void;
  onToggleEvent: (eventId: number, checked: boolean) => void;
  onDuplicateEvent: (event: InfiniteEventType, group: InfiniteEventTypeGroup) => void;
  onDeleteEvent: (eventId: number) => void;
  onReorderEvents: (events: InfiniteEventType[]) => void;
  onLoadMore: () => void;
  onCreatePersonal: () => void;
  onCreateTeam: () => void;
}

export interface DeleteDialogState {
  open: boolean;
  typeId: number;
  schedulingType: SchedulingType | null;
}

// Constants
export const LIMIT = 10;
