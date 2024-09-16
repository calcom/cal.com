import { keepPreviousData } from "@tanstack/react-query";
import { useState, useMemo } from "react";

import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, Divider, FilterSearchField, Icon, Button } from "@calcom/ui";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

type User = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

export const PeopleFilter = () => {
  const { t } = useLocale();

  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isAdmin = currentOrg?.user.role === "ADMIN" || currentOrg?.user.role === "OWNER";
  const hasPermToView = !currentOrg?.isPrivate || isAdmin;

  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const [searchText, setSearchText] = useState("");
  const debouncedSearchTerm = useDebounce(searchText, 500);

  const { data, isFetching, status, fetchNextPage, isFetchingNextPage, hasNextPage } =
    trpc.viewer.teams.listMembers.useInfiniteQuery(
      {
        limit: 10,
        searchTerm: debouncedSearchTerm,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      }
    );

  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.members) ?? [], [data]) as User[];

  const getTextForPopover = () => {
    const userIds = query.userIds;
    if (userIds) {
      return `${t("number_selected", { count: userIds.length })}`;
    }
    return `${t("all")}`;
  };

  const buttonInView = useInViewObserver(() => {
    if (!isFetching && hasNextPage && status === "success") {
      fetchNextPage();
    }
  });

  if (!hasPermToView) {
    return null;
  }

  return (
    <AnimatedPopover text={getTextForPopover()} prefix={`${t("people")}: `}>
      <FilterCheckboxFieldsContainer>
        <FilterCheckboxField
          id="all"
          icon={<Icon name="user" className="h-4 w-4" />}
          checked={!query.userIds?.length}
          onChange={removeAllQueryParams}
          label={t("all_users_filter_label")}
        />
        <Divider />
        <FilterSearchField onChange={(e) => setSearchText(e.target.value)} placeholder={t("search")} />
        {flatData?.map((member) => (
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
        <div className="text-default text-center" ref={buttonInView.ref}>
          <Button
            color="minimal"
            loading={isFetchingNextPage}
            disabled={!hasNextPage}
            onClick={() => fetchNextPage()}>
            {hasNextPage ? t("load_more_results") : t("no_more_results")}
          </Button>
        </div>
        {flatData?.length === 0 && (
          <h2 className="text-default px-4 py-2 text-sm font-medium">{t("no_options_available")}</h2>
        )}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
