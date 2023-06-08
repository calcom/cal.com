import { useSession } from "next-auth/react";
import { useState } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/ee/components/FilterCheckboxField";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, Divider } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

export const WorkflowDropdownFilter = () => {
  const { t } = useLocale();
  const session = useSession();

  const [dropdownTitle, setDropdownTitle] = useState<string>(t("all_apps"));
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const { data: teams } = trpc.viewer.teams.list.useQuery();

  return (
    <AnimatedPopover text={dropdownTitle} popoverContentClassNames="overflow-y-auto">
      <FilterCheckboxFieldsContainer>
        <FilterCheckboxField
          id="all-eventtypes-checkbox"
          icon={<Layers className="h-4 w-4" />}
          checked={dropdownTitle === t("all_apps")}
          onChange={(e) => {
            removeAllQueryParams();
            setDropdownTitle(t("all_apps"));
          }}
          label={t("all_apps")}
        />
        <Divider />
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

        {teams?.map((team, idx) => (
          <FilterCheckboxField
            key={idx}
            id={team.name}
            label={team.name}
            checked={dropdownTitle === team.name}
            onChange={(e) => {
              setDropdownTitle(team.name);
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
  );
};
