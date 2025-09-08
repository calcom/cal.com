"use client";

import React from "react";

import type { TeamTabsProps } from "../types/event-types";
import type { HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { HorizontalTabItem } from "@calid/features/ui/components/navigation";
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
    <div className="mb-4 max-w-full">
      <nav className="no-scrollbar flex overflow-x-scroll border-b border-muted" aria-label="Tabs">
        <HorizontalTabItem {...personalTab} />
        {teamTabs.length > 0 && (
          <div className="mx-3 h-6 w-0.5 bg-subtle self-center" />
        )}
        {teamTabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} />
        ))}
      </nav>
    </div>
  );
};
