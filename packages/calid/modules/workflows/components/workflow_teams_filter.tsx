"use client";

import { useSession } from "next-auth/react";
import React, { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { AnimatedPopover } from "@calcom/ui/components/popover";

import type { CalIdTeamProfile, CalIdTeamFiltersState } from "../config/types";

interface TeamsFilterProps {
  profiles: CalIdTeamProfile[];
  checked: CalIdTeamFiltersState;
  setChecked: Dispatch<SetStateAction<CalIdTeamFiltersState>>;
}

export const TeamsFilter: React.FC<TeamsFilterProps> = ({ profiles, checked, setChecked }) => {
  const session = useSession();
  const { t } = useLocale();

  const userId = session.data?.user.id || 0;
  const user = session.data?.user.name || "";
  const userName = session.data?.user.username;
  const userAvatar = `${WEBAPP_URL}/${userName}/avatar.png`;

  const teams = useMemo(() => profiles.filter((profile) => !!profile.calIdTeamId), [profiles]);
  const [noFilter, setNoFilter] = useState(true);

  const handleUserToggle = useCallback(
    (isChecked: boolean) => {
      if (isChecked) {
        setChecked({ userId: userId, calIdTeamIds: checked.calIdTeamIds });
        if (checked.calIdTeamIds.length === teams.length) {
          setNoFilter(true);
        }
      } else {
        setChecked({ userId: null, calIdTeamIds: checked.calIdTeamIds });
        setNoFilter(false);
      }
    },
    [userId, checked.calIdTeamIds, teams.length, setChecked]
  );

  const handleTeamToggle = useCallback(
    (teamId: number, isChecked: boolean) => {
      if (isChecked) {
        const updatedTeamIds = [...checked.calIdTeamIds, teamId];
        setChecked({ userId: checked.userId, calIdTeamIds: updatedTeamIds });

        if (checked.userId && updatedTeamIds.length === teams.length) {
          setNoFilter(true);
        } else {
          setNoFilter(false);
        }
      } else {
        const updatedTeamIds = checked.calIdTeamIds.filter((id) => id !== teamId);
        setChecked({ userId: checked.userId, calIdTeamIds: updatedTeamIds });

        if (checked.userId && updatedTeamIds.length === teams.length) {
          setNoFilter(true);
        } else {
          setNoFilter(false);
        }
      }
    },
    [checked, teams.length, setChecked]
  );

  const UserFilterItem = ({ disabled = false }: { disabled?: boolean }) => (
    <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] transition hover:cursor-pointer">
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
        checked={disabled ? true : !!checked.userId}
        onChange={disabled ? undefined : (e) => handleUserToggle(e.target.checked)}
        disabled={disabled}
      />
    </div>
  );

  if (!profiles.length) {
    return (
      <AnimatedPopover text={t("all")}>
        <UserFilterItem disabled />
      </AnimatedPopover>
    );
  }

  return (
    <div className={classNames("-mb-2", noFilter ? "w-16" : "w-[100px]")}>
      <AnimatedPopover text={noFilter ? t("all") : t("filtered")}>
        <UserFilterItem />
        {teams.map((profile) => (
          <div
            className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] transition hover:cursor-pointer"
            key={profile.calIdTeamId || 0}>
            <Avatar
              imageSrc={profile.logoUrl || ""}
              size="sm"
              alt={`${profile.slug} Avatar`}
              className="self-center"
              asChild
            />
            <label
              htmlFor={profile.slug || ""}
              className="text-default ml-2 mr-auto select-none self-center truncate text-sm font-medium hover:cursor-pointer">
              {profile.name}
            </label>
            <input
              id={profile.slug || ""}
              name={profile.slug || ""}
              type="checkbox"
              checked={checked.calIdTeamIds?.includes(profile.calIdTeamId || 0)}
              onChange={(e) => handleTeamToggle(profile.calIdTeamId || 0, e.target.checked)}
              className="text-emphasis focus:ring-emphasis dark:text-muted border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded transition"
            />
          </div>
        ))}
      </AnimatedPopover>
    </div>
  );
};
