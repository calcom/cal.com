import { useSession } from "next-auth/react";
import type { ReactNode, InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, Divider, VerticalDivider } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

import { filterQuerySchema } from "../lib/getTeamsFiltersFromQuery";

export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];

function useFilterQuery() {
  // passthrough allows additional params to not be removed
  return useTypedQuery(filterQuerySchema.passthrough());
}

export const TeamsFilter = ({
  popoverTriggerClassNames,
  showVerticalDivider = false,
}: {
  popoverTriggerClassNames?: string;
  showVerticalDivider?: boolean;
}) => {
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
      return `${t("team")}: ${checkedOptions.join(",")}`;
    }
    if (query.userIds) {
      return t("yours");
    }
    return t("all");
  };

  if (!teams || !teams.length) return null;

  return (
    <div className="flex items-center">
      <AnimatedPopover text={getCheckedOptionsNames()} popoverTriggerClassNames={popoverTriggerClassNames}>
        <FilterCheckboxFieldsContainer>
          <FilterCheckboxField
            id="all"
            icon={<Layers className="h-4 w-4" />}
            checked={!query.teamIds && !query.userIds?.includes(session.data?.user.id || 0)}
            onChange={(e) => {
              removeAllQueryParams();
            }}
            label={t("all_apps")}
          />

          <FilterCheckboxField
            id="yours"
            icon={<User className="h-4 w-4" />}
            checked={!!query.userIds?.includes(session.data?.user.id || 0)}
            onChange={(e) => {
              if (e.target.checked) {
                pushItemToKey("userIds", session.data?.user.id || 0);
              } else if (!e.target.checked) {
                removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
              }
            }}
            label={t("yours")}
          />
          <Divider />
          {teams
            ?.filter((team) => !teamMetadataSchema.parse(team.metadata)?.isOrganization)
            .map((team) => (
              <FilterCheckboxField
                key={team.id}
                id={team.name}
                label={team.name}
                checked={!!query.teamIds?.includes(team.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    pushItemToKey("teamIds", team.id);
                  } else if (!e.target.checked) {
                    removeItemByKeyAndValue("teamIds", team.id);
                  }
                }}
                icon={
                  <Avatar
                    alt={team?.name}
                    imageSrc={getPlaceholderAvatar(team.logo, team?.name as string)}
                    size="xs"
                  />
                }
              />
            ))}
        </FilterCheckboxFieldsContainer>
      </AnimatedPopover>
      {showVerticalDivider && <VerticalDivider />}
    </div>
  );
};

export const FilterCheckboxFieldsContainer = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1">{children}</div>;
};

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
};

export const FilterCheckboxField = forwardRef<HTMLInputElement, Props>(({ label, icon, ...rest }, ref) => {
  return (
    <div className="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer">
      <label className="flex w-full items-center justify-between hover:cursor-pointer">
        <div className="flex items-center">
          <div className="text-default flex h-4 w-4 items-center justify-center ltr:mr-2 rtl:ml-2">
            {icon}
          </div>
          <label htmlFor={rest.id} className="text-default cursor-pointer truncate text-sm">
            {label}
          </label>
        </div>
        <div className="flex h-5 items-center">
          <input
            {...rest}
            ref={ref}
            type="checkbox"
            className="text-primary-600 focus:ring-primary-500 border-default bg-default h-4 w-4 rounded hover:cursor-pointer"
          />
        </div>
      </label>
    </div>
  );
});

FilterCheckboxField.displayName = "FilterCheckboxField";
