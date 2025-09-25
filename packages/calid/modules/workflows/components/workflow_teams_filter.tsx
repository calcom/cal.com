"use client";

import { useSession } from "next-auth/react";
import React, { useCallback, useMemo } from "react";

import { filterQuerySchema } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { AnimatedPopover } from "@calcom/ui/components/popover";

import type { CalIdTeamProfile } from "../config/types";

interface TeamsFilterProps {
  profiles: CalIdTeamProfile[];
}

export const TeamsFilter: React.FC<TeamsFilterProps> = ({ profiles }) => {
  const session = useSession();
  const { t } = useLocale();
  const {
    data: query,
    pushItemToKey,
    removeItemByKeyAndValue,
    setQuery,
    removeByKey,
  } = useTypedQuery(filterQuerySchema);

  const userId = session.data?.user.id || 0;
  const user = session.data?.user.name || "";
  const userName = session.data?.user.username;
  const userAvatar = `${WEBAPP_URL}/${userName}/avatar.png`;

  // Filter out teams without IDs and memoize
  const teams = useMemo(() => profiles.filter((profile) => !!profile.id), [profiles]);

  // Determine if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(query.userIds?.length || query.calIdTeamIds?.length);
  }, [query.userIds?.length, query.calIdTeamIds?.length]);

  // Check if user is selected (normalize to array for consistent checking)
  const isUserSelected = useMemo(() => {
    return query.userIds?.includes(userId) || false;
  }, [query.userIds, userId]);

  // Get selected team IDs (normalized to array)
  const selectedTeamIds = useMemo(() => {
    return query.calIdTeamIds || [];
  }, [query.calIdTeamIds]);

  const handleUserToggle = useCallback(
    (isChecked: boolean) => {
      if (isChecked) {
        setQuery("userIds", [userId]);
      } else {
        removeByKey("userIds");
      }
    },
    [userId, setQuery, removeByKey]
  );

  const handleTeamToggle = useCallback(
    (teamId: number, isChecked: boolean) => {
      if (isChecked) {
        pushItemToKey("calIdTeamIds", teamId);
      } else {
        removeItemByKeyAndValue("calIdTeamIds", teamId);
      }
    },
    [pushItemToKey, removeItemByKeyAndValue]
  );

  const UserFilterItem = ({ disabled = false }: { disabled?: boolean }) => (
    <div className="item-center bg-muted  hover:bg-emphasis flex px-4 py-[6px] transition hover:cursor-pointer">
      <Avatar imageSrc={userAvatar || ""} size="sm" alt={`${user} Avatar`} className="self-center" asChild />
      <label
        htmlFor="yourWorkflows"
        className="text-default ml-2 mr-auto self-center truncate text-sm font-medium">
        {disabled ? userName : user}
      </label>
      <input
        id="yourWorkflows"
        type="checkbox"
        className="text-emphasis focus:ring-emphasis dark:text-muted border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded transition"
        checked={disabled ? true : isUserSelected}
        onChange={disabled ? undefined : (e) => handleUserToggle(e.target.checked)}
        disabled={disabled}
      />
    </div>
  );

  // If no profiles, show simplified filter with just user
  if (!profiles.length) {
    return (
      <AnimatedPopover text={t("all")}>
        <UserFilterItem disabled />
      </AnimatedPopover>
    );
  }

  return (
    <div className={classNames("-mb-2", hasActiveFilters ? "w-[100px]" : "w-16")}>
      <AnimatedPopover text={hasActiveFilters ? t("filtered") : t("all")}>
        <UserFilterItem />
        {teams.map((profile) => (
          <div
            className="item-center hover:bg-emphasis bg-muted flex px-4 py-[6px] transition hover:cursor-pointer"
            key={profile.id}>
            <Avatar
              imageSrc={profile.logoUrl || ""}
              size="sm"
              alt={`${profile.slug} Avatar`}
              className="self-center"
              asChild
            />
            <label
              htmlFor={`team-${profile.id}`}
              className="text-default ml-2 mr-auto select-none self-center truncate text-sm font-medium hover:cursor-pointer">
              {profile.name}
            </label>
            <input
              id={`team-${profile.id}`}
              name={`team-${profile.id}`}
              type="checkbox"
              checked={selectedTeamIds.includes(profile.id || 0)}
              onChange={(e) => handleTeamToggle(profile.id || 0, e.target.checked)}
              className="text-emphasis focus:ring-emphasis dark:text-muted border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded transition"
            />
          </div>
        ))}
      </AnimatedPopover>
    </div>
  );
};
