import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { User } from "@calcom/ui/components/icon";

import { useFilterQuery } from "../lib/useFilterQuery";

export const PeopleFilter = () => {
  const { t } = useLocale();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey } = useFilterQuery();
  const { data } = trpc.viewer.teams.listMembers.useQuery({});
  const [dropdownTitle, setDropdownTitle] = useState<string>(t("all_users_filter_label"));

  if (!data || !data.length) return null;

  // Get user names from query
  const userNames = data?.filter((user) => query.userIds?.includes(user.id)).map((user) => user.name);

  return (
    <AnimatedPopover text={userNames && userNames.length > 0 ? `${userNames.join(", ")}` : dropdownTitle}>
      <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
        <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <User className="h-5 w-5" />
        </div>
        <label htmlFor="allUsers" className="text-default mr-auto self-center truncate text-sm font-medium">
          {t("all_users_filter_label")}
        </label>

        <input
          id="allUsers"
          type="checkbox"
          checked={!query.userIds}
          onChange={() => {
            setDropdownTitle(t("all_users_filter_label"));
            // Always clear userIds on toggle as this is the toggle box for all users. No params means we are currently selecting all users
            removeByKey("userIds");
          }}
          className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
        />
      </div>
      {data &&
        data.map((user) => (
          <div
            className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer"
            key={`${user.id}`}>
            <Avatar
              imageSrc={WEBAPP_URL + `/${user.username}/avatar.png`}
              size="sm"
              alt={`${user.name} Avatar`}
              gravatarFallbackMd5="fallback"
              className="self-center"
              asChild
            />
            <label
              htmlFor={user.name ?? "NamelessUser"}
              className="text-default ml-2 mr-auto self-center truncate text-sm font-medium hover:cursor-pointer">
              {user.name}
            </label>

            <input
              id={user.name ?? "NamelessUser"}
              name={user.name ?? "NamelessUser"}
              type="checkbox"
              checked={query.userIds?.includes(user.id)}
              onChange={(e) => {
                setDropdownTitle(user.name ?? "NamelessUser");
                if (e.target.checked) {
                  pushItemToKey("userIds", user.id);
                } else if (!e.target.checked) {
                  removeItemByKeyAndValue("userIds", user.id);
                }
              }}
              className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
            />
          </div>
        ))}
    </AnimatedPopover>
  );
};
