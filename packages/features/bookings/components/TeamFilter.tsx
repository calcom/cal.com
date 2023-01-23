import { useSession } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, Icon } from "@calcom/ui";

import { useFilterQuery } from "../lib/useFilterQuery";

export const TeamsMemberFilter = () => {
  const { t } = useLocale();
  const session = useSession();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey } = useFilterQuery();
  const { data } = trpc.viewer.teams.list.useQuery();

  if (!data || !data.length) return null;

  // get team names from query
  const teamNames = data?.filter((team) => query.teamIds?.includes(team.id)).map((team) => team.name);

  return (
    <AnimatedPopover
      text={teamNames && teamNames.length > 0 ? `${teamNames.join(", ")}` : t("all_bookings_filter_label")}>
      <div className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50">
        <div className="flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <Icon.FiLayers className="h-5 w-5" />
        </div>
        <label
          htmlFor="allBookings"
          className="mr-auto self-center truncate text-sm font-medium text-gray-700">
          {t("all_bookings_filter_label")}
        </label>

        <input
          id="allBookings"
          type="checkbox"
          checked={!query.teamIds && !query.userIds?.includes(session.data?.user.id || 0)}
          onChange={() => {
            removeByKey("teamIds"); // Always clear on toggle  or not toggle (seems weird but when you know the behviour it works well )
          }}
          className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
        />
      </div>
      <div className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50">
        <div className="flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <Icon.FiUser className="h-5 w-5" />
        </div>
        <label
          htmlFor="yourBookings"
          className="mr-auto self-center truncate text-sm font-medium text-gray-700">
          {t("your_bookings_filter_label")}
        </label>

        <input
          id="yourBookings"
          type="checkbox"
          disabled={session.status === "loading"}
          checked={query.userIds?.includes(session.data?.user.id || 0)}
          onChange={(e) => {
            if (e.target.checked) {
              pushItemToKey("userIds", session.data?.user.id || 0);
            } else if (!e.target.checked) {
              removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
            }
          }}
          className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
        />
      </div>
      {data &&
        data.map((team) => (
          <div
            className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50"
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
              className="ml-2 mr-auto select-none self-center truncate text-sm font-medium text-gray-700 hover:cursor-pointer">
              {team.name}
            </label>

            <input
              id={team.name}
              name={team.name}
              type="checkbox"
              checked={query.teamIds?.includes(team.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  pushItemToKey("teamIds", team.id);
                } else if (!e.target.checked) {
                  removeItemByKeyAndValue("teamIds", team.id);
                }
              }}
              className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
            />
          </div>
        ))}
    </AnimatedPopover>
  );
};
