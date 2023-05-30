import { useSession } from "next-auth/react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

import { useFilterQuery } from "../lib/useFilterQuery";

export const TeamsMemberFilter = () => {
  const { t } = useLocale();
  const session = useSession();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey, removeAllQueryParams } = useFilterQuery();
  const { data } = trpc.viewer.teams.list.useQuery();
  const [dropdownTitle, setDropdownTitle] = useState<string>(t("all_bookings_filter_label"));

  if (!data || !data.length) return null;

  // get team names from query
  const teamNames = data?.filter((team) => query.teamIds?.includes(team.id)).map((team) => team.name);

  return (
    <AnimatedPopover text={teamNames && teamNames.length > 0 ? `${teamNames.join(", ")}` : dropdownTitle}>
      <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
        <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <Layers className="h-5 w-5" />
        </div>
        <label
          htmlFor="allBookings"
          className="text-default mr-auto self-center truncate text-sm font-medium">
          {t("all_bookings_filter_label")}
        </label>

        <input
          id="allBookings"
          type="checkbox"
          checked={!query.teamIds && !query.userIds?.includes(session.data?.user.id || 0)}
          onChange={() => {
            setDropdownTitle(t("all_bookings_filter_label"));
            removeAllQueryParams();
          }}
          className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
        />
      </div>
      <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
        <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <User className="h-5 w-5" />
        </div>
        <label
          htmlFor="yourBookings"
          className="text-default mr-auto self-center truncate text-sm font-medium">
          {t("your_bookings_filter_label")}
        </label>

        <input
          id="yourBookings"
          type="checkbox"
          disabled={session.status === "loading"}
          checked={!!query.userIds?.includes(session.data?.user.id || 0)}
          onChange={(e) => {
            setDropdownTitle(t("your_bookings_filter_label"));
            if (e.target.checked) {
              pushItemToKey("userIds", session.data?.user.id || 0);
            } else if (!e.target.checked) {
              removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
            }
          }}
          className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
        />
      </div>
      {data &&
        data.map((team) => (
          <div
            className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer"
            key={`${team.id}`}>
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
              className="text-default ml-2 mr-auto select-none self-center truncate text-sm font-medium hover:cursor-pointer">
              {team.name}
            </label>

            <input
              id={team.name}
              name={team.name}
              type="checkbox"
              checked={query.teamIds?.includes(team.id)}
              onChange={(e) => {
                setDropdownTitle(team.name);
                if (e.target.checked) {
                  pushItemToKey("teamIds", team.id);
                } else if (!e.target.checked) {
                  removeItemByKeyAndValue("teamIds", team.id);
                }
              }}
              className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
            />
          </div>
        ))}
    </AnimatedPopover>
  );
};
