"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch/switch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@calid/features/ui/components/tooltip";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useMemo, useState, useEffect } from "react";

import { extractHostTimezone, filterActiveLinks } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { DraggableEventCardProps } from "../types/event-types";
import { EventTypeCardIcon } from "./event-type-card-icon";
import type { IconParams } from "./event-type-card-icon";
import { EventTypeIconPicker } from "./event-type-icon-picker";

export const DraggableEventCard: React.FC<DraggableEventCardProps> = ({
  event,
  selectedTeam,
  currentTeam,
  isEventActive,
  copiedLink,
  bookerUrl,
  onEventEdit,
  onCopyLink,
  onToggleEvent,
  onDuplicateEvent,
  onDeleteEvent,
}) => {
  const { t } = useLocale();
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [currentIconParams, setCurrentIconParams] = useState<IconParams | undefined>(
    event.metadata?.iconParams as IconParams
  );

  // CRITICAL FIX: Sync local state with props when event data changes
  useEffect(() => {
    const eventIconParams = event.metadata?.iconParams as IconParams;
    setCurrentIconParams(eventIconParams);
  }, [event.metadata?.iconParams]);

  // TRPC mutation for updating event types
  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: () => {
      showToast(t("event_icon_updated"), "success");
      // Force a refetch or invalidate queries to ensure all components see the update
      // You might want to add this depending on your TRPC setup:
      // utils.viewer.eventTypes.list.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
      // Revert local state on error
      setCurrentIconParams(event.metadata?.iconParams as IconParams);
    },
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Build the event URL based on current team structure
  const eventUrl = useMemo(() => {
    if (currentTeam?.teamId) {
      return `/${currentTeam.profile.slug}/${event.slug}`;
    }
    return `/${currentTeam?.profile.slug}/${event.slug}`;
  }, [currentTeam, event.slug]);

  // Get user timezone for hashed links
  const userTimezone = useMemo(() => {
    return extractHostTimezone({
      userId: event.userId,
      teamId: event.teamId,
      hosts: event.hosts,
      owner: event.owner,
      team: event.team,
    });
  }, [event]);

  // Handle private links
  const activeHashedLinks = useMemo(() => {
    return event.hashedLink ? filterActiveLinks(event.hashedLink, userTimezone) : [];
  }, [event.hashedLink, userTimezone]);

  const isManagedEventType = event.schedulingType === SchedulingType.MANAGED;
  const isChildrenManagedEventType =
    event.metadata?.managedEventConfig !== undefined && event.schedulingType !== SchedulingType.MANAGED;

  const handleCopyPrivateLink = () => {
    const privateLink = `${bookerUrl}/d/${activeHashedLinks[0].link}/${event.slug}`;
    navigator.clipboard.writeText(privateLink);
    showToast(t("private_link_copied"), "success");
  };

  const handleIconSelect = (newIconParams: IconParams) => {
    console.log("Selected icon for event:", event.id, newIconParams);

    // Update local state immediately for UI responsiveness
    setCurrentIconParams(newIconParams);

    // Prepare the update payload - only include the required fields for your mutation
    const updateData = {
      id: event.id,
      metadata: {
        ...event.metadata,
        iconParams: newIconParams,
      },
      // Add other required fields based on your mutation input type
      // You may need to include these fields depending on your backend requirements:
      // title: event.title,
      // slug: event.slug,
      // length: event.length,
      // schedulingType: event.schedulingType,
      // etc.
    };

    updateMutation.mutate(updateData);
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsIconPickerOpen(true);
  };

  return (
    <>
      <div ref={setNodeRef} style={style} className="animate-fade-in group relative flex items-center">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute flex w-4 flex-shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
          style={{ cursor: "grab", left: "-20px" }}
          onMouseDown={(e) => (e.currentTarget.style.cursor = "grabbing")}
          onMouseUp={(e) => (e.currentTarget.style.cursor = "grab")}
          onClick={(e) => e.stopPropagation()}>
          <Icon name="grip-vertical" className="text-muted-foreground h-5 w-5" />
        </div>

        {/* Card content */}
        <div
          className={`bg-card border-border hover:border-border/60 flex-1 cursor-pointer rounded-md border px-4 py-4 transition-all hover:shadow-sm ${
            !isEventActive ? "opacity-50" : ""
          } ${isDragging ? "opacity-50 shadow-lg" : ""}`}
          onClick={() => onEventEdit(event.id)}>
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start space-x-3">
              {/* Event Type Icon - Updated with icon picker functionality */}
              <div
                className="bg-muted hover:bg-muted/70 group/icon relative flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors"
                onClick={handleIconClick}
                title="Click to change icon">
                <EventTypeCardIcon iconParams={currentIconParams} className="h-5 w-5" />
                {/* Overlay hint on hover */}
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/10 opacity-0 transition-opacity group-hover/icon:opacity-100">
                  <Icon name="pencil" className="h-3 w-3 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-foreground text-base font-semibold">{event.title}</h3>

                  {/* URL box with icons */}
                  <div className="bg-muted text-muted-foreground relative flex items-center space-x-1 rounded px-2 py-1 text-sm">
                    <span>{`${bookerUrl}${eventUrl}`}</span>

                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyLink(event.id, eventUrl);
                            }}
                            className="hover:bg-muted flex items-center justify-center rounded p-0.5">
                            <Icon name="copy" className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="rounded-sm px-2 py-1 text-xs" side="bottom" sideOffset={4}>
                          Copy
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`${bookerUrl}${eventUrl}`, "_blank");
                            }}
                            className="hover:bg-muted flex items-center justify-center rounded p-0.5">
                            <Icon name="external-link" className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="rounded-sm px-2 py-1 text-xs" side="bottom" sideOffset={4}>
                          Preview
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {copiedLink === event.id.toString() && (
                      <div className="animate-fade-in absolute left-1/2 top-full z-50 ml-2 mt-1 whitespace-nowrap rounded border border-gray-200 bg-white px-2 py-1 text-xs text-black shadow-md">
                        Copied!
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Description */}
                <p className="text-muted text-sm">{event.description}</p>

                {/* Duration and scheduling info */}
                <div className="flex items-center space-x-3">
                  {event.metadata?.multipleDuration ? (
                    event.metadata.multipleDuration.map((duration, idx) => (
                      <span
                        key={idx}
                        className="bg-muted text-foreground inline-flex items-center rounded px-2 py-1 text-sm">
                        <Icon name="clock" className="mr-1 h-3 w-3" />
                        {duration}m
                      </span>
                    ))
                  ) : (
                    <span className="bg-muted text-foreground inline-flex items-center rounded px-2 py-1 text-sm">
                      <Icon name="clock" className="mr-1 h-3 w-3" />
                      {event.length}m
                    </span>
                  )}

                  {/* Team members for team events */}
                  {event.teamId && !isManagedEventType && event.users && event.users.length > 0 && (
                    <div className="flex -space-x-1">
                      {event.users.slice(0, 3).map((user, idx) => (
                        <div
                          key={user.id}
                          className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-medium">
                          {user.name?.[0] || user.email?.[0] || "U"}
                        </div>
                      ))}
                      {event.users.length > 3 && (
                        <div className="bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs">
                          +{event.users.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ml-4 flex items-center space-x-2">
              {/* Enable toggle - only for non-managed events */}
              {!isManagedEventType && (
                <Switch
                  checked={isEventActive}
                  onCheckedChange={(checked) => onToggleEvent(event.id, checked)}
                  onClick={(e) => e.stopPropagation()}
                  size="sm"
                />
              )}

              {/* Options dropdown */}
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="hover:bg-muted rounded-md p-1.5 transition-colors">
                      <Icon name="ellipsis" className="text-muted-foreground h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {!currentTeam?.metadata?.readOnly && (
                      <DropdownMenuItem onClick={() => onEventEdit(event.id)} className="text-sm">
                        <Icon name="pencil" className="mr-2 h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                    )}

                    {/* Change Icon option */}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        setIsIconPickerOpen(true);
                      }}
                      className="text-sm">
                      <Icon name="palette" className="mr-2 h-3 w-3" />
                      Change Icon
                    </DropdownMenuItem>

                    {!isManagedEventType && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(`${bookerUrl}${eventUrl}`, "_blank");
                        }}
                        className="text-sm">
                        <Icon name="external-link" className="mr-2 h-3 w-3" />
                        Preview
                      </DropdownMenuItem>
                    )}

                    {!currentTeam?.metadata?.readOnly &&
                      !isManagedEventType &&
                      !isChildrenManagedEventType && (
                        <DropdownMenuItem
                          onClick={() => onDuplicateEvent(event, currentTeam)}
                          className="text-sm">
                          <Icon name="copy" className="mr-2 h-3 w-3" />
                          Duplicate
                        </DropdownMenuItem>
                      )}

                    {/* Private link option */}
                    {activeHashedLinks.length > 0 && !isManagedEventType && (
                      <DropdownMenuItem onClick={handleCopyPrivateLink} className="text-sm">
                        <Icon name="venetian-mask" className="mr-2 h-3 w-3" />
                        Copy private link
                      </DropdownMenuItem>
                    )}

                    {!currentTeam?.metadata?.readOnly && !isChildrenManagedEventType && (
                      <DropdownMenuItem
                        onClick={() => onDeleteEvent(event.id)}
                        className="text-destructive focus:text-destructive text-sm">
                        <Icon name="trash-2" className="mr-2 h-3 w-3" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Icon Picker Dialog */}
      <EventTypeIconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentIconParams={currentIconParams}
        onSelectIcon={handleIconSelect}
      />
    </>
  );
};
