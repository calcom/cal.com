import {
  useFilterValue,
  ZDateRangeFilterValue,
  ZMultiSelectFilterValue,
  ZTextFilterValue,
} from "@calcom/features/data-table";

export function useBookingFilters() {
  const eventTypeIds = useFilterValue("eventTypeId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const teamIds = useFilterValue("teamId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const userIds = useFilterValue("userId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;
  const attendeeName = useFilterValue("attendeeName", ZTextFilterValue);
  const attendeeEmail = useFilterValue("attendeeEmail", ZTextFilterValue);
  const bookingUid = useFilterValue("bookingUid", ZTextFilterValue)?.data?.operand as string | undefined;

  return {
    eventTypeIds,
    teamIds,
    userIds,
    dateRange,
    attendeeName,
    attendeeEmail,
    bookingUid,
  };
}
