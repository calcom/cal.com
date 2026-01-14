"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { z } from "zod";

import { DuplicateDialog } from "@calcom/features/eventtypes/components/DuplicateDialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useInViewObserver } from "@calcom/lib/hooks/useInViewObserver";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { trpc } from "@calcom/trpc/react";

import { CreateEventModal } from "../components/create-event-modal";
import { CreateTeamEventModal } from "../components/create-team-event-modal";
import { DeleteEventDialog } from "../components/delete-event-dialog";
import { EventTypesHeader } from "../components/event-type-header";
import { EventTypesContent } from "../components/event-types-content";
import { TeamTabs } from "../components/team-tabs";
import { useEventTypesMutations } from "../hooks/useEventTypesMutations";
import type { InfiniteEventType, InfiniteEventTypeGroup, DeleteDialogState } from "../types/event-types";
import { LIMIT } from "../types/event-types";

// Query schema for URL parameters
const querySchema = z.object({
  teamId: z.nullable(z.coerce.number()).optional().default(null),
  eventPage: z.string().optional(),
  dialog: z.string().optional(),
});

export const EventTypes = () => {
  const router = useRouter();
  const { copyToClipboard } = useCopy();
  const { data: sessionData } = useSession();

  // URL state management
  const { data: queryData } = useTypedQuery(querySchema);
  const selectedTeam = queryData.teamId?.toString() || "personal";

  // Local state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [selectedTeamForCreation, setSelectedTeamForCreation] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventStates, setEventStates] = useState<{ [key: number]: boolean }>({});
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    typeId: 0,
    schedulingType: null,
  });

  const newDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchQuery, 500);

  const userEventGroupsQuery = trpc.viewer.eventTypes.calid_getUserEventGroups.useQuery();

  const eventTypeGroups = useMemo(
    () => userEventGroupsQuery.data?.eventTypeGroups || [],
    [userEventGroupsQuery.data?.eventTypeGroups]
  );
  const profiles = useMemo(
    () => userEventGroupsQuery.data?.profiles || [],
    [userEventGroupsQuery.data?.profiles]
  );

  const currentTeam = useMemo(() => {
    if (selectedTeam === "personal") {
      return eventTypeGroups.find((group) => !group.teamId);
    }
    return eventTypeGroups.find((group) => group.teamId?.toString() === selectedTeam);
  }, [eventTypeGroups, selectedTeam]);

  const eventTypesQuery = trpc.viewer.eventTypes.calid_getEventTypesFromGroup.useInfiniteQuery(
    {
      limit: LIMIT,
      searchQuery: debouncedSearchTerm,
      group: {
        calIdTeamId: currentTeam?.teamId || null,
        parentId: currentTeam?.parentId || null,
      },
    },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor;
      },
      initialCursor: 0, // Add initial cursor
    }
  );

  const buttonInView = useInViewObserver(() => {
    if (!eventTypesQuery.isFetching && eventTypesQuery.hasNextPage && eventTypesQuery.status === "success") {
      eventTypesQuery.fetchNextPage();
    }
  }, null);

  const { mutations, handlers } = useEventTypesMutations(currentTeam, debouncedSearchTerm);

  const filteredEvents = useMemo(() => {
    const allEvents = eventTypesQuery.data?.pages.flatMap((page) => page.eventTypes) || [];
    if (!debouncedSearchTerm) return allEvents;
    return allEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [eventTypesQuery.data?.pages, debouncedSearchTerm]);

  // Initialize event states from real data
  useEffect(() => {
    const initialStates: { [key: number]: boolean } = {};
    filteredEvents.forEach((event) => {
      initialStates[event.id] = !event.hidden;
    });
    setEventStates(initialStates);
  }, [filteredEvents]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setShowNewDropdown(false);
      }
    };

    if (showNewDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNewDropdown]);

  // Booker URL logic
  const bookerUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_WEBSITE_URL || "https://cal.id";
  }, []);

  // Event handlers
  const handleCreateEvent = useCallback((_eventData: unknown) => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCopyLink = useCallback(
    (eventId: number, url: string) => {
      copyToClipboard(`${bookerUrl}${url}`);
      setCopiedLink(eventId.toString());
      setTimeout(() => setCopiedLink(null), 1500);
    },
    [copyToClipboard, bookerUrl]
  );

  const handleCopyPublicLink = useCallback(() => {
    const publicUrl = currentTeam?.teamId
      ? `${bookerUrl}/${currentTeam?.profile.slug}`
      : `${bookerUrl}/${currentTeam?.profile.slug}`;
    copyToClipboard(publicUrl);
    setCopiedPublicLink(true);
    setTimeout(() => setCopiedPublicLink(false), 1500);
  }, [currentTeam, bookerUrl, copyToClipboard]);

  const handleToggleEvent = useCallback(
    (eventId: number, checked: boolean) => {
      setEventStates((prev) => ({ ...prev, [eventId]: checked }));
      handlers.handleToggleEvent(eventId, checked);
    },
    [handlers]
  );

  const handleReorderEvents = useCallback(
    (reorderedEvents: InfiniteEventType[]) => {
      // Changed from eventTypesQuery.data?.eventTypes to get first page's events
      const allEvents = eventTypesQuery.data?.pages[0]?.eventTypes || [];
      handlers.handleReorderEvents(reorderedEvents, allEvents);
    },
    [handlers, eventTypesQuery.data?.pages]
  );

  const handleNewSelection = useCallback((teamId: string) => {
    setShowNewDropdown(false);
    if (teamId === "personal") {
      setIsCreateModalOpen(true);
    } else {
      setSelectedTeamForCreation(teamId);
      setIsCreateTeamModalOpen(true);
    }
  }, []);

  const handleDuplicateEvent = useCallback(
    (event: InfiniteEventType, group: InfiniteEventTypeGroup) => {
      const searchParams = new URLSearchParams(window.location.search);
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
      router.push(`${window.location.pathname}?${searchParams.toString()}`);
    },
    [router]
  );

  const handleDeleteEvent = useCallback(
    (eventId: number) => {
      const event = filteredEvents.find((e) => e.id === eventId);
      setDeleteDialog({
        open: true,
        typeId: eventId,
        schedulingType: event?.schedulingType || null,
      });
    },
    [filteredEvents]
  );

  const handleConfirmDelete = useCallback(() => {
    handlers.handleDeleteEvent(deleteDialog.typeId);
    setDeleteDialog({ open: false, typeId: 0, schedulingType: null });
  }, [handlers, deleteDialog.typeId]);

  const handleTeamChange = useCallback(
    (teamId: string | null) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (teamId && teamId !== "personal") {
        searchParams.set("teamId", teamId);
      } else {
        searchParams.delete("teamId");
      }
      router.push(`${window.location.pathname}?${searchParams.toString()}`);
    },
    [router]
  );

  // Error state
  if (userEventGroupsQuery.error) {
    return <div className="p-4">Error loading event types</div>;
  }

  if (!currentTeam) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Responsive Container */}
      <div className="mx-auto w-full px-2 lg:px-0">
        {/* Team Tabs */}
        <TeamTabs
          eventTypeGroups={eventTypeGroups}
          profiles={profiles}
          selectedTeam={selectedTeam}
          onTeamChange={handleTeamChange}
        />

        {/* Header with Search and New Button */}
        <EventTypesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentTeam={currentTeam}
          bookerUrl={bookerUrl}
          copiedPublicLink={copiedPublicLink}
          onCopyPublicLink={handleCopyPublicLink}
          showNewDropdown={showNewDropdown}
          onToggleNewDropdown={() => setShowNewDropdown(!showNewDropdown)}
          onNewSelection={handleNewSelection}
          eventTypeGroups={eventTypeGroups}
          newDropdownRef={newDropdownRef}
        />

        {/* Main Content */}
        <EventTypesContent
          isLoading={eventTypesQuery.isLoading && !eventTypesQuery.data}
          filteredEvents={filteredEvents}
          selectedTeam={selectedTeam}
          currentTeam={currentTeam}
          eventStates={eventStates}
          copiedLink={copiedLink}
          bookerUrl={bookerUrl}
          debouncedSearchTerm={debouncedSearchTerm}
          hasNextPage={eventTypesQuery.hasNextPage ?? false}
          isFetchingNextPage={eventTypesQuery.isFetchingNextPage}
          onEventEdit={handlers.handleEventEdit}
          onCopyLink={handleCopyLink}
          onToggleEvent={handleToggleEvent}
          onDuplicateEvent={handleDuplicateEvent}
          onDeleteEvent={handleDeleteEvent}
          onReorderEvents={handleReorderEvents}
          onLoadMore={() => eventTypesQuery.fetchNextPage()}
          onCreatePersonal={() => setIsCreateModalOpen(true)}
          onCreateTeam={() => setIsCreateTeamModalOpen(true)}
          buttonInViewRef={buttonInView}
        />
      </div>

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateEvent={handleCreateEvent}
        pageSlug={sessionData?.user?.username ?? undefined}
        urlPrefix={bookerUrl}
      />

      <CreateTeamEventModal
        open={isCreateTeamModalOpen}
        onClose={() => {
          setIsCreateTeamModalOpen(false);
          setSelectedTeamForCreation("");
        }}
        teamId={selectedTeamForCreation || selectedTeam}
        teamName={
          eventTypeGroups.find((g) => g.teamId?.toString() === (selectedTeamForCreation || selectedTeam))
            ?.profile.name || ""
        }
        teamSlug={
          eventTypeGroups.find((g) => g.teamId?.toString() === (selectedTeamForCreation || selectedTeam))
            ?.profile.slug ?? undefined
        }
        isTeamAdminOrOwner={true}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteEventDialog
        deleteDialog={deleteDialog}
        onClose={() => setDeleteDialog({ open: false, typeId: 0, schedulingType: null })}
        onConfirm={handleConfirmDelete}
        isDeleting={mutations.delete.isPending}
      />

      {/* Duplicate Dialog - from original implementation */}
      <DuplicateDialog />
    </div>
  );
};
