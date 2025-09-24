"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useMemo, useState, useEffect } from "react";

import { extractHostTimezone, filterActiveLinks } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

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
    (event.metadata?.iconParams as IconParams) || { icon: "calendar", color: "#6B7280" }
  );

  useEffect(() => {
    const eventIconParams = event.metadata?.iconParams as IconParams;
    setCurrentIconParams(eventIconParams || { icon: "calendar", color: "#6B7280" });
  }, [event.metadata?.iconParams]);

  const updateMutation = trpc.viewer.eventTypes.calid_update.useMutation({
    onSuccess: () => {
      triggerToast(t("event_icon_updated"), "success");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
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
      teamId: event.calIdTeam?.id || null,
      hosts: event.hosts,
      owner: event.owner,
      team: event.calIdTeam,
    });
  }, [event]);

  if (event.slug === "collaborative-evaluation") {
    console.log("here", currentIconParams);
  }

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
    triggerToast(t("private_link_copied"), "success");
  };

  const handleIconSelect = (newIconParams: IconParams) => {
    setCurrentIconParams(newIconParams);
    const updateData = {
      id: event.id,
      metadata: {
        ...event.metadata,
        iconParams: newIconParams,
      },
    };

    updateMutation.mutate(updateData);
  };

  const handleIconClick = () => {
    // Open icon picker dialog
    setIsIconPickerOpen(true);
  };

  const publicUrl = `${bookerUrl}${eventUrl}`;
  const cleanPublicUrl = `${publicUrl}`.replace(/^https?:\/\//, "");

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          ...(isDragging && { height: 0, overflow: "hidden" }),
        }}
        className={`group relative w-full ${
          !isDragging ? "animate-fade-in" : "pointer-events-none opacity-0"
        }`}>
        {/* Drag handle - Hidden on mobile for better touch experience */}
        <div
          {...attributes}
          {...listeners}
          className="absolute hidden w-4 flex-shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
          style={{ cursor: "grab", left: "-20px" }}
          onMouseDown={(e) => (e.currentTarget.style.cursor = "grabbing")}
          onMouseUp={(e) => (e.currentTarget.style.cursor = "grab")}
          onClick={(e) => e.stopPropagation()}>
          <Icon name="grip-vertical" />
        </div>

        {/* Card content */}
        <div
          className="border-default bg-default w-full cursor-pointer rounded-md border p-3 transition-all hover:shadow-md sm:p-4"
          onClick={() => onEventEdit(event.id)}>
          {/* Mobile-first responsive layout */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            {/* Main content area */}
            <div className="flex min-w-0 flex-1 items-start space-x-3">
              {/* Event Type Icon */}
              <div className="flex-shrink-0">
                <EventTypeCardIcon iconParams={currentIconParams} onClick={handleIconClick} />
              </div>

              {/* Event details */}
              <div className="min-w-0 flex-1">
                {/* Title and URL - Stack on mobile, inline on larger screens */}
                <div className="mb-2 flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-2 sm:space-y-0">
                  <h3 className="text-emphasis text-medium truncate font-semibold">{event.title}</h3>
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" isPublicUrl={true} className="text-xs">
                      <span className="max-w-[200px] truncate sm:max-w-[300px] lg:max-w-none">
                        {cleanPublicUrl}
                      </span>
                    </Badge>
                  </div>
                </div>

                {/* Event Description - Show only on larger screens or truncate on mobile */}
                {event.description && (
                  <p className="text-subtle mb-3 line-clamp-2 text-sm sm:line-clamp-none">
                    {event.description}
                  </p>
                )}

                {/* Duration and scheduling info - Responsive badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {event.metadata?.multipleDuration ? (
                    event.metadata.multipleDuration.map((duration, idx) => (
                      <Badge key={idx} variant="secondary" size="sm" startIcon="clock">
                        {duration}m
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" size="sm" startIcon="clock">
                      {event.length}m
                    </Badge>
                  )}

                  {/* Scheduling type badge for team events */}
                  {(event.calIdTeam || event.teamId) && event.schedulingType && (
                    <Badge variant="secondary" size="sm" startIcon="users">
                      <span className="hidden sm:inline">
                        {event.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
                        {event.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
                        {event.schedulingType === SchedulingType.MANAGED && t("managed")}
                      </span>
                      <span className="sm:hidden">
                        {event.schedulingType === SchedulingType.ROUND_ROBIN && "RR"}
                        {event.schedulingType === SchedulingType.COLLECTIVE && "Col"}
                        {event.schedulingType === SchedulingType.MANAGED && "Mgd"}
                      </span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Controls area - Stack below on mobile, inline on desktop */}
            <div className="flex items-center justify-between sm:ml-4 sm:flex-shrink-0 sm:justify-end">
              <div className="flex items-center space-x-3">
                {/* Enable toggle - only for non-managed events */}
                {!isManagedEventType && (
                  <div className="flex items-center space-x-2">
                    <span className="text-subtle text-sm sm:hidden">{isEventActive ? "On" : "Off"}</span>
                    <Switch
                      checked={isEventActive}
                      onCheckedChange={(checked) => onToggleEvent(event.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Options dropdown */}
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        color="secondary"
                        variant="icon"
                        StartIcon="ellipsis"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 sm:h-auto sm:w-auto"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 sm:w-40">
                      {!currentTeam?.metadata?.readOnly && (
                        <DropdownMenuItem onClick={() => onEventEdit(event.id)} className="text-sm">
                          <Icon name="pencil-line" className="mr-2 h-3 w-3" />
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
                            window.open(`${publicUrl}`, "_blank");
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
      </div>

      {/* Icon Picker Dialog */}
      <EventTypeIconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentIconParams={currentIconParams || { icon: "calendar", color: "#6B7280" }}
        onSelectIcon={handleIconSelect}
      />
    </>
  );
};
