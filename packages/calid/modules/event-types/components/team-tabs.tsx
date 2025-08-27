"use client";

import React from "react";

import type { TeamTabsProps } from "../types/event-types";

export const TeamTabs: React.FC<TeamTabsProps> = ({
  eventTypeGroups,
  profiles,
  selectedTeam,
  onTeamChange,
}) => {
  const personalProfile = profiles.find((p) => !p.teamId);
  const teamGroups = eventTypeGroups.filter((group) => group.teamId);

  return (
    <div className="bg-background border-border border-b">
      <div className="flex items-center">
        {/* Personal tab */}
        <button
          onClick={() => onTeamChange(null)}
          className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            selectedTeam === "personal"
              ? "border-active text-active"
              : "text-muted-foreground hover:text-foreground hover:border-muted-foreground border-transparent"
          }`}>
          <div className="flex items-center space-x-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-medium ${
                selectedTeam === "personal" ? "bg-active text-active-foreground" : "bg-muted-foreground/20"
              }`}>
              {personalProfile?.name?.[0] || "U"}
            </div>
            <span>{personalProfile?.name || "Personal"}</span>
          </div>
        </button>

        {/* Separator */}
        {teamGroups.length > 0 && <div className="mx-3 h-4 w-px bg-blue-200" />}

        {/* Team tabs */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex space-x-0">
            {teamGroups.map((group) => (
              <button
                key={group.teamId}
                onClick={() => onTeamChange(group.teamId?.toString() || null)}
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  selectedTeam === group.teamId?.toString()
                    ? "border-active text-active"
                    : "text-muted-foreground hover:text-foreground hover:border-muted-foreground border-transparent"
                }`}>
                <div className="flex items-center space-x-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-medium ${
                      selectedTeam === group.teamId?.toString()
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20"
                    }`}>
                    {group.profile.name?.[0] || "T"}
                  </div>
                  <span>{group.profile.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
