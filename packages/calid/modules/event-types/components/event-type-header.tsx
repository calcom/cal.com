"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { TextField } from "@calid/features/ui/components/input/input";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import type { EventTypesHeaderProps } from "../types/event-types";

export const EventTypesHeader: React.FC<EventTypesHeaderProps> = ({
  searchQuery,
  onSearchChange,
  currentTeam,
  bookerUrl,
  copiedPublicLink,
  onCopyPublicLink,
  showNewDropdown,
  onToggleNewDropdown,
  onNewSelection,
  eventTypeGroups,
  newDropdownRef,
}) => {
  const publicUrl = currentTeam?.teamId
    ? `${bookerUrl}/${currentTeam?.profile.slug}`
    : `${bookerUrl}/${currentTeam?.profile.slug}`;
  const cleanPublicUrl = publicUrl.replace(/^https?:\/\//, "");
  const { t } = useLocale();

  // Find the personal profile (team without teamId)
  const personalProfile = eventTypeGroups.find((group) => !group.teamId);

  return (
    <div className="mb-4 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          {/* Search Bar */}
          <TextField
            addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
            addOnClassname="!border-muted"
            containerClassName={classNames("focus:!ring-offset-0 py-2")}
            type="search"
            autoComplete="false"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("search_events")}
          />

          {/* Public URL Display */}
          <Badge variant="secondary" isPublicUrl={true} className="rounded-md">
            {cleanPublicUrl}
          </Badge>
        </div>

        {/* New Button with Dropdown */}
        <div className="relative" ref={newDropdownRef}>
          <Button StartIcon="plus" onClick={onToggleNewDropdown} disabled={currentTeam?.metadata?.readOnly}>
            {t("new")}
          </Button>

          {showNewDropdown && (
            <div className="bg-default border-border animate-scale-in absolute right-0 top-full z-10 mt-1 w-44 rounded-md border shadow-lg">
              <div className="py-1">
                {/* Personal option - always show if personal profile exists */}
                {personalProfile && (
                  <button
                    onClick={() => onNewSelection("personal")}
                    className="hover:bg-muted flex w-full items-center px-3 py-1.5 text-sm transition-colors">
                    <Avatar
                      imageSrc={personalProfile.profile.image}
                      size="xs"
                      alt={personalProfile.profile.name}
                      className="mr-2"
                    />
                    {personalProfile.profile.name}
                  </button>
                )}
                {/* Team options - show all teams that are not read-only */}
                {eventTypeGroups
                  .filter((group) => group.teamId && !group.metadata?.readOnly)
                  .map((group) => (
                    <button
                      key={group.teamId}
                      onClick={() => onNewSelection(group.teamId?.toString() || "")}
                      className="hover:bg-muted flex w-full items-center px-3 py-1.5 text-sm transition-colors">
                      <div className="bg-primary text-primary-foreground mr-2 flex h-3 w-3 items-center justify-center rounded-full text-xs font-medium">
                        <Avatar imageSrc={group.profile.image} size="xs" alt={group.profile.name} />
                      </div>
                      {group.profile.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
