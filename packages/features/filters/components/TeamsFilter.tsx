import { useSession } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

import { filterQuerySchema } from "../lib/getTeamsFiltersFromQuery";

export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];

function useFilterQuery() {
  // passthrough allows additional params to not be removed
  return useTypedQuery(filterQuerySchema.passthrough());
}

export const TeamsFilter = () => {
  const { t } = useLocale();
  const session = useSession();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const { data: teams } = trpc.viewer.teams.list.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
  });
  const getCheckedOptionsNames = () => {
    const checkedOptions: string[] = [];
    const teamIds = query.teamIds;
    if (teamIds) {
      const selectedTeamsNames = teams
        ?.filter((team) => {
          return teamIds.includes(team.id);
        })
        ?.map((team) => team.name);
      if (selectedTeamsNames) {
        checkedOptions.push(...selectedTeamsNames);
      }
      return checkedOptions.join(",");
    }
    if (query.userIds) {
      return t("yours");
    }
    return t("all");
  };

  if (!teams || !teams.length) return null;

  return (
    <AnimatedPopover text={getCheckedOptionsNames()}>
      <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
        <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <Layers className="h-5 w-5" />
        </div>
        <label
          htmlFor="all"
          className="text-default mr-auto self-center truncate text-sm font-medium leading-none">
          {t("all")}
        </label>

        <input
          id="all"
          type="checkbox"
          checked={!query.teamIds && !query.userIds?.includes(session.data?.user.id || 0)}
          onChange={() => {
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
          htmlFor="yours"
          className="text-default mr-auto self-center truncate text-sm font-medium leading-none">
          {t("yours")}
        </label>

        <input
          id="yours"
          type="checkbox"
          disabled={session.status === "loading"}
          checked={!!query.userIds?.includes(session.data?.user.id || 0)}
          onChange={(e) => {
            if (e.target.checked) {
              pushItemToKey("userIds", session.data?.user.id || 0);
            } else if (!e.target.checked) {
              removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
            }
          }}
          className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
        />
      </div>
      <hr className="border-subtle my-1" />
      {teams &&
        teams.map((team) => (
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
              className="text-default ml-2 mr-auto select-none self-center truncate text-sm font-medium leading-none hover:cursor-pointer">
              {team.name}
            </label>

            <input
              id={team.name}
              name={team.name}
              type="checkbox"
              checked={!!query.teamIds?.includes(team.id)}
              onChange={(e) => {
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
