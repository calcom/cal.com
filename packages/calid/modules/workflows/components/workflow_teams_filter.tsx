"use client";

import type { HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { HorizontalTabItem } from "@calid/features/ui/components/navigation";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import React, { useCallback, useMemo } from "react";

import { filterQuerySchema } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";

import type { CalIdTeamProfile } from "../config/types";

interface TeamsFilterProps {
  profiles: CalIdTeamProfile[];
}

export const TeamsFilter: React.FC<TeamsFilterProps> = ({ profiles }) => {
  const session = useSession();
  const { data: query, setQuery } = useTypedQuery(filterQuerySchema);

  const userId = session.data?.user.id || 0;
  const userName = session.data?.user.username;
  const userDisplayName = session.data?.user.name || "Personal";
  const userAvatar = `${WEBAPP_URL}/${userName}/avatar.png`;

  // Filter out teams without IDs and memoize
  const teams = useMemo(() => {
    return profiles.filter((profile) => !!profile.id).sort((a, b) => a?.name.localeCompare(b?.name));
  }, [profiles]);

  // Determine the currently selected filter (single selection)
  const selectedFilter = useMemo(() => {
    // Check if a team is selected (single team only)
    if (query.calIdTeamIds?.length === 1) {
      return { type: "team" as const, id: query.calIdTeamIds[0] };
    }
    // Check if user is selected
    if (query.userIds?.length === 1 && query.userIds[0] === userId) {
      return { type: "user" as const, id: userId };
    }
    // Default to 'user' (will be set by useEffect)
    return { type: "user" as const, id: userId };
  }, [query.calIdTeamIds, query.userIds, userId]);

  const router = useRouter();
  const pathname = usePathname();

  const handleUserClick = useCallback(() => {
    const searchParams = new URLSearchParams();
    searchParams.set("userIds", String(userId));
    router.push(`${pathname}?${searchParams.toString()}`);
  }, [pathname, router, userId]);

  const handleTeamClick = useCallback(
    (teamId: number) => {
      const searchParams = new URLSearchParams();
      searchParams.set("calIdTeamIds", String(teamId));
      router.push(`${pathname}?${searchParams.toString()}`);
    },
    [pathname, router]
  );

  const personalTab: HorizontalTabItemProps = {
    name: userDisplayName,
    href: "#",
    avatar: userAvatar,
    isActive: selectedFilter.type === "user",
    onClick: () => handleUserClick(),
  };

  const teamTabs: HorizontalTabItemProps[] = teams.map((profile) => ({
    name: profile.name ?? "Team",
    href: "#",
    avatar: profile.logoUrl || undefined,
    isActive: selectedFilter.type === "team" && selectedFilter.id === profile.id,
    onClick: () => handleTeamClick(profile.id || 0),
  }));

  // If no profiles, show simplified filter with just user
  if (!profiles.length) {
    return (
      <div className="mb-4 w-full">
        <nav
          className="no-scrollbar border-muted scrollbar-hide flex overflow-x-auto border-b pb-0"
          aria-label="Tabs"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="flex min-w-max space-x-1">
            <HorizontalTabItem {...personalTab} />
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="mb-4 w-full">
      <nav
        className="no-scrollbar border-muted scrollbar-hide flex overflow-x-auto border-b pb-0"
        aria-label="Tabs"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="flex min-w-max space-x-1">
          <HorizontalTabItem {...personalTab} />
          {teamTabs.length > 0 && <div className="bg-subtle mx-2 h-6 w-0.5 self-center sm:mx-3" />}
          {teamTabs.map((tab, idx) => (
            <HorizontalTabItem {...tab} key={teams[idx].id} />
          ))}
        </div>
      </nav>
    </div>
  );
};
