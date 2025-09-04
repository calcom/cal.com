"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@calid/features/ui/components/tooltip";
import React from "react";

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

  return (
    <div className="w-full max-w-full space-y-3 py-4 pt-3">
      <div className="flex items-center justify-between space-x-3">
        <div className="flex flex-1 items-center space-x-3">
          {/* Search Bar */}
          <div className="relative w-72">
            <Icon
              name="search"
              className="text-muted-foreground absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 transform"
            />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-border bg-background w-full rounded-md border py-1.5 pl-8 pr-3 text-sm"
            />
          </div>

          {/* Public URL Display */}
          <div className="bg-muted text-muted-foreground relative flex items-center space-x-1 rounded px-2 py-1 text-xs">
            <span className="text-xs">
              {currentTeam?.bookerUrl || bookerUrl}/{currentTeam?.profile.slug}
            </span>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onCopyPublicLink}
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
                    onClick={() => window.open(publicUrl, "_blank")}
                    className="hover:bg-muted flex items-center justify-center rounded p-0.5">
                    <Icon name="external-link" className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-sm px-2 py-1 text-xs" side="bottom" sideOffset={4}>
                  Preview
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {copiedPublicLink && (
              <div className="animate-fade-in absolute left-1/2 top-full z-50 ml-2 mt-1 whitespace-nowrap rounded border border-gray-200 bg-white px-2 py-1 text-xs text-black shadow-md">
                Copied!
              </div>
            )}
          </div>
        </div>

        {/* New Button with Dropdown */}
        <div className="relative" ref={newDropdownRef}>
          <Button onClick={onToggleNewDropdown} size="sm" disabled={currentTeam?.metadata?.readOnly}>
            <Icon name="plus" className="mr-1 h-3 w-3" />
            New
          </Button>

          {showNewDropdown && (
            <div className="bg-default border-border animate-scale-in absolute right-0 top-full z-10 mt-1 w-44 rounded-md border shadow-lg">
              <div className="py-1">
                <button
                  onClick={() => onNewSelection("personal")}
                  className="hover:bg-muted flex w-full items-center px-3 py-1.5 text-sm transition-colors">
                  <Icon name="user" className="mr-2 h-3 w-3" />
                  Personal Event
                </button>
                {eventTypeGroups
                  .filter((group) => group.teamId && !group.metadata?.readOnly)
                  .map((group) => (
                    <button
                      key={group.teamId}
                      onClick={() => onNewSelection(group.teamId?.toString() || "")}
                      className="hover:bg-muted flex w-full items-center px-3 py-1.5 text-sm transition-colors">
                      <div className="bg-primary text-primary-foreground mr-2 flex h-3 w-3 items-center justify-center rounded-full text-xs font-medium">
                        {group.profile.name?.[0] || "T"}
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
