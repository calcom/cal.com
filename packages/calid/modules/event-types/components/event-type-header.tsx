"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
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
      <div className="flex flex-row items-center justify-between space-x-3">
        {/* Search Bar and Public URL - Always inline */}
        <div className="flex flex-1 flex-row items-center space-x-3">
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

          {/* Public URL Display - Always visible but with responsive sizing */}
          <div className="hidden md:block">
            <Badge variant="secondary" publicUrl={cleanPublicUrl} className="rounded-md">
              <span className="truncate">{cleanPublicUrl}</span>
            </Badge>
          </div>
        </div>

        {/* New Button with Dropdown */}
        <div className="flex-shrink-0" ref={newDropdownRef}>
          <DropdownMenu open={showNewDropdown} onOpenChange={onToggleNewDropdown}>
            <DropdownMenuTrigger asChild>
              <Button StartIcon="plus" disabled={currentTeam?.metadata?.readOnly} className="w-auto">
                {t("new")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 sm:w-44" align="end">
              {/* Personal option - always show if personal profile exists */}
              {personalProfile && (
                <DropdownMenuItem onClick={() => onNewSelection("personal")}>
                  <Avatar
                    imageSrc={personalProfile.profile.image}
                    size="xs"
                    alt={personalProfile.profile.name ?? ""}
                    className="mr-3 flex-shrink-0"
                  />
                  <span className="truncate">{personalProfile.profile.name}</span>
                </DropdownMenuItem>
              )}
              {/* Team options - show all teams that are not read-only */}
              {eventTypeGroups
                .filter((group) => group.teamId && !group.metadata?.readOnly)
                .map((group) => (
                  <DropdownMenuItem
                    key={group.teamId}
                    onClick={() => onNewSelection(group.teamId?.toString() || "")}>
                    <div className="bg-primary text-primary-foreground mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      <Avatar imageSrc={group.profile.image} size="xs" alt={group.profile.name ?? ""} />
                    </div>
                    <span className="truncate">{group.profile.name}</span>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Public URL Display for Mobile - Shows below on small screens */}
      <div className="mt-3 md:hidden">
        <Badge variant="secondary" publicUrl={cleanPublicUrl} className="rounded-md">
          <span className="truncate">{cleanPublicUrl}</span>
        </Badge>
      </div>
    </div>
  );
};
