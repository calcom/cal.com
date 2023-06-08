import { useSession } from "next-auth/react";
import { useState, Fragment } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/ee/components/FilterCheckboxField";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];

export const OrganizationEventTypeFilter = () => {
  const { t } = useLocale();
  const session = useSession();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const [dropdownTitle, setDropdownTitle] = useState<string>(t("all_apps"));

  const { data: teams, status } = trpc.viewer.teams.list.useQuery();
  const isNotEmpty = !!teams?.length;

  return status === "success" ? (
    <AnimatedPopover
      text={dropdownTitle}
      popoverTriggerClassNames="mb-0"
      popoverContentClassNames="overflow-y-auto">
      <FilterCheckboxFieldsContainer>
        <FilterCheckboxField
          id="all-eventtypes-checkbox"
          icon={<Layers className="h-4 w-4" />}
          checked={dropdownTitle === t("all_apps")}
          onChange={(e) => {
            removeAllQueryParams();
            setDropdownTitle(t("all_apps"));
            //  TODO: What to do when all event types is unchecked
          }}
          label={t("all_apps")}
        />

        <FilterCheckboxField
          id="all-eventtypes-checkbox"
          icon={<User className="h-4 w-4" />}
          checked={query.userIds?.includes(session.data?.user.id || 0)}
          onChange={(e) => {
            setDropdownTitle(t("yours"));
            if (e.target.checked) {
              pushItemToKey("userIds", session.data?.user.id || 0);
            } else if (!e.target.checked) {
              removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
            }
          }}
          label={t("yours")}
        />

        {isNotEmpty && (
          <Fragment>
            <div className="text-subtle px-4 py-2.5 text-xs font-medium uppercase leading-none">TEAMS</div>
            {teams?.map((team) => (
              <FilterCheckboxField
                key={team.id}
                id={team.name}
                label={team.name}
                icon={
                  <Avatar
                    alt={team?.name}
                    imageSrc={getPlaceholderAvatar(team.logo, team?.name as string)}
                    size="xs"
                  />
                }
                checked={query.teamIds?.includes(team.id)}
                onChange={(e) => {
                  setDropdownTitle(team.name);
                  if (e.target.checked) {
                    pushItemToKey("teamIds", team.id);
                  } else if (!e.target.checked) {
                    removeItemByKeyAndValue("teamIds", team.id);
                  }
                }}
              />
            ))}
          </Fragment>
        )}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  ) : null;
};
