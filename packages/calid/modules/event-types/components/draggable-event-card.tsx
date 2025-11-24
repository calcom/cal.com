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
import { isManagedEventType } from "../utils/event-types-utils";
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

  const isManagedEvent = isManagedEventType(event);

  const isTeamMember = currentTeam?.membershipRole === "MEMBER";
  const eventUrl = useMemo(() => {
    if (isManagedEvent) {
      return null;
    }
    if (currentTeam?.teamId) {
      return `/${currentTeam.profile.slug}/${event.slug}`;
    }
    return `/${currentTeam?.profile.slug}/${event.slug}`;
  }, [currentTeam, event, isManagedEvent]);

  const userTimezone = useMemo(() => {
    return extractHostTimezone({
      userId: event.userId,
      teamId: event.calIdTeam?.id || null,
      hosts: event.hosts,
      owner: event.owner,
      team: event.calIdTeam,
    });
  }, [event]);

  const activeHashedLinks = useMemo(() => {
    return event.hashedLink ? filterActiveLinks(event.hashedLink, userTimezone) : [];
  }, [event.hashedLink, userTimezone]);

  const isChildrenManagedEventType = event.metadata?.managedEventConfig !== undefined && !isManagedEvent;

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
    if (isManagedEvent && isTeamMember) return;
    setIsIconPickerOpen(true);
  };

  const publicUrl = eventUrl ? `${bookerUrl}${eventUrl}` : null;
  const cleanPublicUrl = publicUrl ? `${publicUrl}`.replace(/^https?:\/\//, "") : null;

  const displayUrl = isManagedEvent ? null : cleanPublicUrl;

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
        <div
          {...attributes}
          {...listeners}
          className="absolute hidden w-4 flex-shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
          style={{ cursor: "grab", top: "50%", left: "-20px", transform: "translateY(-50%)" }}
          onMouseDown={(e) => (e.currentTarget.style.cursor = "grabbing")}
          onMouseUp={(e) => (e.currentTarget.style.cursor = "grab")}
          onClick={(e) => e.stopPropagation()}>
          <Icon name="grip-vertical" />
        </div>

        <div
          className={`border-default bg-default w-full rounded-md border p-3 transition-all sm:p-4 ${
            isManagedEvent && isTeamMember
              ? "cursor-not-allowed opacity-75"
              : "cursor-pointer hover:shadow-md"
          }`}
          onClick={() => !(isManagedEvent && isTeamMember) && onEventEdit(event.id)}>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="flex min-w-0 flex-1 items-start space-x-3">
              <div className="flex-shrink-0">
                <EventTypeCardIcon
                  iconParams={currentIconParams}
                  onClick={handleIconClick}
                  disabled={isManagedEvent && isTeamMember}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <h3 className="text-emphasis text-medium truncate font-semibold">{event.title}</h3>
                    {displayUrl && (
                      <div className="hidden flex-shrink-0 sm:block">
                        <Badge variant="secondary" publicUrl={cleanPublicUrl} className="max-w-full text-xs">
                          <span className="block truncate">{displayUrl}</span>
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center space-x-2">
                    {!isManagedEvent && !isChildrenManagedEventType && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={isEventActive}
                          onCheckedChange={(checked) => onToggleEvent(event.id, checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        {!(isManagedEvent && isTeamMember) && (
                          <DropdownMenuTrigger asChild>
                            <Button
                              color="secondary"
                              variant="icon"
                              StartIcon="ellipsis"
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 w-8 sm:h-auto sm:w-auto"
                            />
                          </DropdownMenuTrigger>
                        )}
                        <DropdownMenuContent align="end" className="w-44 sm:w-40">
                          {!currentTeam?.metadata?.readOnly && (
                            <DropdownMenuItem onClick={() => onEventEdit(event.id)} className="text-sm">
                              <Icon name="pencil-line" className="mr-2 h-3 w-3" />
                              {t("edit")}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              setIsIconPickerOpen(true);
                            }}
                            className="text-sm">
                            <Icon name="palette" className="mr-2 h-3 w-3" />
                            {t("change_icon")}
                          </DropdownMenuItem>

                          {!isManagedEvent && publicUrl && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(`${publicUrl}`, "_blank");
                              }}
                              className="text-sm">
                              <Icon name="external-link" className="mr-2 h-3 w-3" />
                              {t("preview")}
                            </DropdownMenuItem>
                          )}

                          {!currentTeam?.metadata?.readOnly &&
                            !isManagedEvent &&
                            !isChildrenManagedEventType && (
                              <DropdownMenuItem
                                onClick={() => onDuplicateEvent(event, currentTeam)}
                                className="text-sm">
                                <Icon name="copy" className="mr-2 h-3 w-3" />
                                {t("duplicate")}
                              </DropdownMenuItem>
                            )}

                          {activeHashedLinks.length > 0 && !isManagedEvent && (
                            <DropdownMenuItem onClick={handleCopyPrivateLink} className="text-sm">
                              <Icon name="venetian-mask" className="mr-2 h-3 w-3" />
                              {t("copy_private_link")}
                            </DropdownMenuItem>
                          )}

                          {!currentTeam?.metadata?.readOnly &&
                            !isChildrenManagedEventType &&
                            !isManagedEvent && (
                              <DropdownMenuItem
                                onClick={() => onDeleteEvent(event.id)}
                                className="text-destructive focus:text-destructive hover:bg-error text-sm">
                                <Icon name="trash-2" className="mr-2 h-3 w-3" />
                                {t("delete")}
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {displayUrl && (
                  <div className="mb-2 sm:hidden">
                    <Badge variant="secondary" publicUrl={cleanPublicUrl} className="max-w-full text-xs">
                      <span className="block truncate">{displayUrl}</span>
                    </Badge>
                  </div>
                )}

                {event.description && (
                  <p className="text-subtle mb-3 mr-20 line-clamp-2 text-sm sm:line-clamp-none">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
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

                  {event.locations && event.locations.length > 0 && (
                    <Badge variant="secondary" size="sm" startIcon="map-pin">
                      {event.locations.length === 1
                        ? (() => {
                            const location = event.locations[0];
                            if (typeof location === "string") return location;
                            if (location?.type === "integrations:jitsi") return t("jitsi");
                            if (location?.type === "integrations:zoom") return t("zoom");
                            if (location?.type === "integrations:google:meet") return t("google_meet");
                            if (location?.type === "integrations:office365_video") return t("teams");
                            if (location?.type === "integrations:webex") return t("webex");
                            if (location?.type === "inPerson") return t("in_person");
                            if (location?.type === "attendeeInPerson") return t("attendee_in_person");
                            if (location?.type === "link") return t("link");
                            return t("location");
                          })()
                        : `${event.locations.length} ${t("locations")}`}
                    </Badge>
                  )}

                  {event.requiresConfirmation && (
                    <Badge variant="secondary" size="sm" startIcon="circle-check">
                      {t("requires_confirmation")}
                    </Badge>
                  )}

                  {event.recurringEvent && (
                    <Badge variant="secondary" size="sm" startIcon="repeat">
                      {t("recurring")}
                    </Badge>
                  )}

                  {event.seatsPerTimeSlot && (
                    <Badge variant="secondary" size="sm" startIcon="users">
                      {event.seatsPerTimeSlot} {t("seats")}
                    </Badge>
                  )}

                  {event.hidden && (
                    <Badge variant="secondary" size="sm" startIcon="eye-off">
                      {t("hidden")}
                    </Badge>
                  )}

                  {isManagedEvent && isTeamMember && (
                    <Badge variant="secondary" size="sm">
                      {t("readonly")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EventTypeIconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentIconParams={currentIconParams || { icon: "calendar", color: "#6B7280" }}
        onSelectIcon={handleIconSelect}
      />
    </>
  );
};
