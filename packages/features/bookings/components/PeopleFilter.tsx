import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { FiUser } from "@calcom/ui/components/icon";

import { useFilterQuery } from "../lib/useFilterQuery";

export const PeopleFilter = () => {
  const { t } = useLocale();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey } = useFilterQuery();
  const { data } = trpc.viewer.teams.listMembers.useQuery({});

  if (!data || !data.length) return null;

  // Get user names from query
  const userNames = data?.filter((user) => query.userIds?.includes(user.id)).map((user) => user.name);

  return (
    <AnimatedPopover
      text={userNames && userNames.length > 0 ? `${userNames.join(", ")}` : t("all_users_filter_label")}>
      <div className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50">
        <div className="flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <FiUser className="h-5 w-5" />
        </div>
        <label htmlFor="allUsers" className="mr-auto self-center truncate text-sm font-medium text-gray-700">
          {t("all_users_filter_label")}
        </label>

        <input
          id="allUsers"
          type="checkbox"
          checked={!query.userIds}
          onChange={() => {
            // Always clear userIds on toggle as this is the toggle box for all users. No params means we are currently selecting all users
            removeByKey("userIds");
          }}
          className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
        />
      </div>
      {data &&
        data.map((user) => (
          <div
            className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50"
            key={`${user.id}`}>
            <Avatar
              imageSrc={user.avatar}
              size="sm"
              alt={`${user.name} Avatar`}
              gravatarFallbackMd5="fallback"
              className="self-center"
              asChild
            />
            <label
              htmlFor={user.name ?? "NamelessUser"}
              className="ml-2 mr-auto self-center truncate text-sm font-medium text-gray-700 hover:cursor-pointer">
              {user.name}
            </label>

            <input
              id={user.name ?? "NamelessUser"}
              name={user.name ?? "NamelessUser"}
              type="checkbox"
              checked={query.userIds?.includes(user.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  pushItemToKey("userIds", user.id);
                } else if (!e.target.checked) {
                  removeItemByKeyAndValue("userIds", user.id);
                }
              }}
              className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
            />
          </div>
        ))}
    </AnimatedPopover>
  );
};
