"use client";

import type { HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { HorizontalTabItem } from "@calid/features/ui/components/navigation";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

import { filterQuerySchema } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";

import type { CalIdTeamProfile } from "../config/types";

interface TeamsFilterProps {
  profiles: CalIdTeamProfile[];
}

export const TeamsFilter: React.FC<TeamsFilterProps> = ({ profiles }) => {
  const session = useSession();
  const { data: query } = useTypedQuery(filterQuerySchema);
  const router = useRouter();
  const pathname = usePathname();

  const user = session.data?.user;
  const userId = user?.id || 0;

  // Memoize user data
  const userData = useMemo(
    () => ({
      displayName: user?.name || "Personal",
      avatar: getUserAvatarUrl({ avatarUrl: user?.avatarUrl ?? null }),
    }),
    [user?.name, user?.avatarUrl]
  );

  // Filter and sort teams once
  const teams = useMemo(
    () => profiles.filter((profile) => !!profile.id).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  );

  // Determine selected filter
  const selectedFilter = useMemo(() => {
    if (query.calIdTeamIds?.length === 1) {
      return { type: "team" as const, id: query.calIdTeamIds[0] };
    }
    return { type: "user" as const, id: userId };
  }, [query.calIdTeamIds, userId]);

  // Navigation handlers
  const handleUserClick = useCallback(() => {
    router.push(`${pathname}?userIds=${userId}`);
  }, [pathname, router, userId]);

  const handleTeamClick = useCallback(
    (teamId: number) => {
      router.push(`${pathname}?calIdTeamIds=${teamId}`);
    },
    [pathname, router]
  );

  // Build tabs
  const personalTab: HorizontalTabItemProps = useMemo(
    () => ({
      name: userData.displayName,
      href: "#",
      avatar: userData.avatar,
      isActive: selectedFilter.type === "user",
      onClick: handleUserClick,
    }),
    [userData, selectedFilter.type, handleUserClick]
  );

  const teamTabs: HorizontalTabItemProps[] = useMemo(
    () =>
      teams.map((profile) => ({
        name: profile.name ?? "Team",
        href: "#",
        avatar: getPlaceholderAvatar(profile.logoUrl, profile.name),
        isActive: selectedFilter.type === "team" && selectedFilter.id === profile.id,
        onClick: () => handleTeamClick(profile.id || 0),
      })),
    [teams, selectedFilter, handleTeamClick]
  );

  // Shared nav component
  const navContent = (
    <div className="flex min-w-max space-x-1">
      <HorizontalTabItem {...personalTab} />
      {teamTabs.length > 0 && <div className="bg-subtle mx-2 h-6 w-0.5 self-center sm:mx-3" />}
      {teamTabs.map((tab) => (
        <HorizontalTabItem {...tab} key={tab.name} />
      ))}
    </div>
  );

  return (
    <div className="mb-4 w-full">
      <nav
        className="no-scrollbar border-muted scrollbar-hide flex overflow-x-auto border-b pb-0"
        aria-label="Tabs"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {navContent}
      </nav>
    </div>
  );
};
