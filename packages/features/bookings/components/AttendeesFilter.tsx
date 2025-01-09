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
import { AnimatedPopover, Button, Divider, FilterSearchField, Icon } from "@calcom/ui";

export const AttendeesFilter = () => {
  const { t } = useLocale();

  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isAdmin = currentOrg?.user.role === "ADMIN" || currentOrg?.user.role === "OWNER";
  const hasPermToView = !currentOrg?.isPrivate || isAdmin;

  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const [searchText, setSearchText] = useState("");

  const debouncedSearch = useDebounce(searchText, 500);

  const queryAttendees = trpc.viewer.bookings.getAllAttendees.useInfiniteQuery(
    { limit: 10, searchText: debouncedSearch },
    {
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const getTextForPopover = () => {
    const attendeeEmails = query.attendeeEmails;
    if (attendeeEmails) {
      return `${t("number_selected", { count: attendeeEmails.length })}`;
    }
    return `${t("all")}`;
  };

  const { ref: observerRef } = useInViewObserver(() => {
    if (queryAttendees.hasNextPage && !queryAttendees.isFetching) {
      queryAttendees.fetchNextPage();
    }
  }, document.querySelector('[role="dialog"]'));

  const attendees = queryAttendees?.data?.pages.flatMap((page) => page.attendees);

  if (!hasPermToView) {
    return null;
  }

  return (
    <AnimatedPopover text={getTextForPopover()} prefix={`${t("attendees")}: `}>
      <FilterCheckboxFieldsContainer>
        <FilterCheckboxField
          id="all"
          icon={<Icon name="mail" className="h-4 w-4" />}
          checked={!query.attendeeEmails?.length}
          onChange={removeAllQueryParams}
          label={t("all_attendees_filter_label")}
        />
        <Divider />
        <FilterSearchField onChange={(e) => setSearchText(e.target.value)} placeholder={t("search")} />

        {attendees?.map((attendee) => (
          <FilterCheckboxField
            key={attendee.id}
            id={attendee.id.toString()}
            label={attendee.email}
            checked={!!query.attendeeEmails?.includes(attendee.email)}
            onChange={(e) => {
              if (e.target.checked) {
                pushItemToKey("attendeeEmails", attendee.email);
              } else if (!e.target.checked) {
                removeItemByKeyAndValue("attendeeEmails", attendee.email);
              }
            }}
          />
        ))}
        <div className="text-default text-center" ref={observerRef} data-testid="attendees-filter">
          <Button
            color="minimal"
            loading={queryAttendees.isFetchingNextPage}
            disabled={!queryAttendees.hasNextPage}
            onClick={() => queryAttendees.fetchNextPage()}
            data-testid="attendees-filter">
            {queryAttendees.hasNextPage ? t("load_more_results") : t("no_more_results")}
          </Button>
        </div>
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
