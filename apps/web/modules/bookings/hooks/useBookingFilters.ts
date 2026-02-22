import {
  ZMultiSelectFilterValue,
  ZDateRangeFilterValue,
  ZTextFilterValue,
  ZSingleSelectFilterValue,
} from "@calcom/features/data-table";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import { useFilterValue } from "~/data-table/hooks/useFilterValue";

export function useBookingFilters() {
  const { activeFilters } = useDataTable();
  const eventTypeIds = useFilterValue("eventTypeId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const teamIds = useFilterValue("teamId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const userIds = useFilterValue("userId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;
  const attendeeName = useFilterValue("attendeeName", ZTextFilterValue);
  const attendeeEmail = useFilterValue("attendeeEmail", ZTextFilterValue);
  const bookingUid = useFilterValue("bookingUid", ZTextFilterValue)?.data?.operand as string | undefined;
  // noShow is a boolean select, it can either be "true" or "false". 
  // We have to filter noShow based on if it is a active filter.
  const noShow = activeFilters?.some(filter => filter.f === "noShow") ?? false;

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
