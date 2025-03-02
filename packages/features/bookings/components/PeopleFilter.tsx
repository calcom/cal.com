import { useState } from "react";

import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useInViewObserver } from "@calcom/lib/hooks/useInViewObserver";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, Divider, FilterSearchField, Icon, Button } from "@calcom/ui";

export const PeopleFilter = () => {
  const { t } = useLocale();

  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isAdmin = currentOrg?.user.role === "ADMIN" || currentOrg?.user.role === "OWNER";
  const hasPermToView = !currentOrg?.isPrivate || isAdmin;

  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const [searchText, setSearchText] = useState("");

  const debouncedSearch = useDebounce(searchText, 500);

  const queryMembers = trpc.viewer.teams.legacyListMembers.useInfiniteQuery(
    { limit: 10, searchText: debouncedSearch, includeEmail: true },
    {
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const { ref: observerRef } = useInViewObserver(() => {
    if (queryMembers.hasNextPage && !queryMembers.isFetching) {
      queryMembers.fetchNextPage();
    }
  }, document.querySelector('[role="dialog"]'));

  const filteredMembers = queryMembers?.data?.pages.flatMap((page) => page.members);

  const getTextForPopover = () => {
    const userIds = query.userIds;
    if (userIds) {
      return `${t("number_selected", { count: userIds.length })}`;
    }
    return `${t("all")}`;
  };

  if (!hasPermToView) {
    return null;
  }

  return (
    <AnimatedPopover text={getTextForPopover()} prefix={`${t("people")}: `}>
      <FilterCheckboxFieldsContainer>
        <FilterSearchField onChange={(e) => setSearchText(e.target.value)} placeholder={t("search")} />

        <FilterCheckboxField
          id="all"
          icon={<Icon name="user" className="h-4 w-4" />}
          checked={!query.userIds?.length}
          onChange={removeAllQueryParams}
          label={t("all_users_filter_label")}
        />
        <Divider />

        {filteredMembers?.map((member) => (
          <FilterCheckboxField
            key={member.id}
            id={member.id.toString()}
            label={member?.name ?? member.username ?? t("no_name")}
            checked={!!query.userIds?.includes(member.id)}
            onChange={(e) => {
              if (e.target.checked) {
                pushItemToKey("userIds", member.id);
              } else if (!e.target.checked) {
                removeItemByKeyAndValue("userIds", member.id);
              }
            }}
            icon={<Avatar alt={`${member?.id} avatar`} imageSrc={member.avatarUrl} size="xs" />}
          />
        ))}
        <div className="text-default text-center" ref={observerRef} data-testid="people-filter">
          <Button
            color="minimal"
            loading={queryMembers.isFetchingNextPage}
            disabled={!queryMembers.hasNextPage}
            onClick={() => queryMembers.fetchNextPage()}
            data-testid="people-filter">
            {queryMembers.hasNextPage ? t("load_more_results") : t("no_more_results")}
          </Button>
        </div>
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
