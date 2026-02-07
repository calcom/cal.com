import {
  useDataTable,
  useFilterValue,
  ZMultiSelectFilterValue,
  ZDateRangeFilterValue,
  ZTextFilterValue,
} from "@calcom/features/data-table";

export function useBookingFilters() {
  const { activeFilters } = useDataTable();
  const eventTypeIds = useFilterValue("eventTypeId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const teamIds = useFilterValue("teamId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const userIds = useFilterValue("userId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;
  const attendeeName = useFilterValue("attendeeName", ZTextFilterValue);
  const attendeeEmail = useFilterValue("attendeeEmail", ZTextFilterValue);
  const bookingUid = useFilterValue("bookingUid", ZTextFilterValue)?.data?.operand as string | undefined;
  const hasNoShowFilter = activeFilters?.some((filter) => filter.f === "noShow") ?? false;
  const noShow = hasNoShowFilter ? true : undefined;

  return {
    eventTypeIds,
    teamIds,
    userIds,
    dateRange,
    attendeeName,
    attendeeEmail,
    bookingUid,
    noShow,
  };
}
