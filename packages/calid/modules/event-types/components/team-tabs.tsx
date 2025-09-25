"use client";

import type { HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { HorizontalTabItem } from "@calid/features/ui/components/navigation";
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

  // Personal tab data
  const personalTab: HorizontalTabItemProps = {
    name: personalProfile?.name || "Personal",
    href: "#",
    avatar: personalProfile?.image,
    isActive: selectedTeam === "personal",
    onClick: () => onTeamChange(null),
  };

  // Team tabs data
  const teamTabs: HorizontalTabItemProps[] = teamGroups.map((group) => ({
    name: group.profile.name,
    href: "#",
    avatar: group.profile.image,
    isActive: selectedTeam === group.teamId?.toString(),
    onClick: () => onTeamChange(group.teamId?.toString() || null),
  }));

  return (
    <div className="mb-4 w-full">
      <nav
        className="no-scrollbar border-muted scrollbar-hide flex overflow-x-auto border-b pb-0"
        aria-label="Tabs"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="flex min-w-max space-x-1 px-2 sm:px-0">
          <HorizontalTabItem {...personalTab} />
          {teamTabs.length > 0 && <div className="bg-subtle mx-2 h-6 w-0.5 self-center sm:mx-3" />}
          {teamTabs.map((tab, idx) => (
            <HorizontalTabItem {...tab} key={idx} />
          ))}
        </div>
      </nav>
    </div>
  );
};
