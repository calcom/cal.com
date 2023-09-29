import { useState } from "react";

import { useBookingMultiFilterStore } from "@calcom/features/bookings/BookingMultiFiltersStore";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import {
  FilterCheckboxFieldsContainer,
  FilterCheckboxField,
} from "@calcom/features/filters/components/TeamsFilter";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, FilterSearchField } from "@calcom/ui";

export const PeopleFilter = () => {
  const { t } = useLocale();
  const orgBranding = useOrgBranding();

  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey } = useFilterQuery();
  const [searchText, setSearchText] = useState("");

  const members = trpc.viewer.teams.listMembers.useQuery({});

  const filteredMembers = members?.data
    ?.filter((member) => member.accepted)
    ?.filter((member) =>
      searchText.trim() !== ""
        ? member?.name?.toLowerCase()?.includes(searchText.toLowerCase()) ||
          member?.username?.toLowerCase()?.includes(searchText.toLowerCase())
        : true
    );

  const getTextForPopover = () => {
    const userIds = query.userIds;
    if (userIds) {
      return `${t("people")}:  ${t("number_selected", { count: userIds.length })}`;
    }
    return `${t("people")}: ${t("all")}`;
  };

  const [addActiveFilter, removeActiveFilter] = useBookingMultiFilterStore((state) => [
    state.addActiveFilter,
    state.removeActiveFilter,
  ]);

  return (
    <AnimatedPopover text={getTextForPopover()}>
      <FilterSearchField onChange={(e) => setSearchText(e.target.value)} placeholder={t("search")} />
      <FilterCheckboxFieldsContainer>
        {filteredMembers?.map((member) => (
          <FilterCheckboxField
            key={member.id}
            id={member.id.toString()}
            label={member?.name ?? member.username ?? t("no_name")}
            checked={!!query.userIds?.includes(member.id)}
            onChange={(e) => {
              if (e.target.checked) {
                pushItemToKey("userIds", member.id);
                addActiveFilter("people");
              } else if (!e.target.checked) {
                removeItemByKeyAndValue("userIds", member.id);
                if (query.userIds?.length === 1 || !query.userIds) {
                  removeActiveFilter("people");
                }
              }
            }}
            icon={
              <Avatar
                alt={`${member?.id} avatar`}
                imageSrc={
                  member.username
                    ? `${orgBranding?.fullDomain ?? WEBAPP_URL}/${member.username}/avatar.png`
                    : undefined
                }
                size="xs"
              />
            }
          />
        ))}
        {filteredMembers?.length === 0 && (
          <h2 className="text-default px-4 py-2 text-sm font-medium">{t("no_options_available")}</h2>
        )}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
