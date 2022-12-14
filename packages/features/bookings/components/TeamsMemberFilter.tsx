import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, Icon } from "@calcom/ui";

import { useFilterQuery } from "../lib/useFilterQuery";

export const TeamsMemberFilter = () => {
  const { t } = useLocale();
  const { data: query, pop, push, clear } = useFilterQuery();
  const { data } = trpc.viewer.teams.list.useQuery();

  return (
    <AnimatedPopover text={t("members")}>
      <div className="item-center flex px-4 py-[6px] focus-within:bg-gray-100">
        <div className="mr-2 flex h-6 w-6 items-center justify-center">
          <Icon.FiLayers className="h-full w-full" />
        </div>
        <label
          htmlFor="allBookings"
          className="mr-auto self-center truncate text-sm font-medium text-gray-700">
          {t("all_bookings_filter_label")}
        </label>

        <input
          id="allBookings"
          type="checkbox"
          checked={!query.teamIds}
          onChange={() => {
            clear("teamIds"); // Always clear on toggle  or not toggle (seems weird but when you know the behviour it works well )
          }}
          className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
        />
      </div>
      {data &&
        data.map((team) => (
          <div className="item-center flex px-4 py-[6px] focus-within:bg-gray-100" key={`${team.id}`}>
            <Avatar
              imageSrc={team.logo}
              size="sm"
              alt={`${team.name} Avatar`}
              gravatarFallbackMd5="fallback"
              className="self-center"
              asChild
            />
            <label
              htmlFor={team.name}
              className="ml-2 mr-auto self-center truncate text-sm font-medium text-gray-700">
              {team.name}
            </label>

            <input
              id={team.name}
              name={team.name}
              type="checkbox"
              checked={query.teamIds?.includes(team.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  push("teamIds", team.id);
                } else if (!e.target.checked) {
                  pop("teamIds", team.id);
                }
              }}
              className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
            />
          </div>
        ))}
    </AnimatedPopover>
  );
};
