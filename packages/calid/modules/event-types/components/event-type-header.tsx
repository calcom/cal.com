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
    <div className="mb-6 w-full">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        {/* Search Bar and Public URL - Mobile: Stacked, Desktop: Inline */}
        <div className="flex flex-1 flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-3 sm:space-y-0">
          {/* Search Bar */}
          <div className="w-full sm:max-w-md">
            <TextField
              addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
              addOnClassname="!border-muted"
              containerClassName={classNames("focus:!ring-offset-0 py-2")}
              type="search"
              autoComplete="false"
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("search_events")}
            />
          </div>

          {/* Public URL Display - Hidden on small mobile, shown on larger screens */}
          <div className="hidden sm:block">
            <Badge variant="secondary" publicUrl={cleanPublicUrl} className="rounded-md">
              <span className="max-w-[200px] truncate lg:max-w-none">{cleanPublicUrl}</span>
            </Badge>
          </div>
        </div>

        {/* New Button with Dropdown */}
        <div className="relative flex-shrink-0" ref={newDropdownRef}>
          <Button
            StartIcon="plus"
            onClick={onToggleNewDropdown}
            disabled={currentTeam?.metadata?.readOnly}
            className="w-full sm:w-auto">
            {t("new")}
          </Button>

          {showNewDropdown && (
            <div className="bg-default border-border animate-scale-in absolute right-0 top-full z-10 mt-1 w-60 rounded-md border shadow-lg sm:w-44">
              <div className="py-1">
                {/* Personal option - always show if personal profile exists */}
                {personalProfile && (
                  <button
                    onClick={() => onNewSelection("personal")}
                    className="hover:bg-muted flex w-full items-center px-3 py-2 text-sm transition-colors">
                    <Avatar
                      imageSrc={personalProfile.profile.image}
                      size="xs"
                      alt={personalProfile.profile.name ?? ""}
                      className="mr-3 flex-shrink-0"
                    />
                    <span className="truncate">{personalProfile.profile.name}</span>
                  </button>
                )}
                {/* Team options - show all teams that are not read-only */}
                {eventTypeGroups
                  .filter((group) => group.teamId && !group.metadata?.readOnly)
                  .map((group) => (
                    <button
                      key={group.teamId}
                      onClick={() => onNewSelection(group.teamId?.toString() || "")}
                      className="hover:bg-muted flex w-full items-center px-3 py-2 text-sm transition-colors">
                      <div className="bg-primary text-primary-foreground mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium">
                        <Avatar imageSrc={group.profile.image} size="xs" alt={group.profile.name ?? ""} />
                      </div>
                      <span className="truncate">{group.profile.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Public URL Display for Mobile - Shows below on small screens */}
      <div className="mt-3 sm:hidden">
        <Badge variant="secondary" publicUrl={cleanPublicUrl} className="rounded-md">
          <span className="truncate">{cleanPublicUrl}</span>
        </Badge>
      </div>
    </div>
  );
};
