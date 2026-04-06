import { ZMultiSelectFilterValue, ZDateRangeFilterValue, ZTextFilterValue } from "@calcom/features/data-table";
import { useFilterValue } from "~/data-table/hooks/useFilterValue";

export function useBookingFilters() {
  const eventTypeIds = useFilterValue("eventTypeId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const teamIds = useFilterValue("teamId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const userIds = useFilterValue("userId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;
  const attendeeName = useFilterValue("attendeeName", ZTextFilterValue);
  const attendeeEmail = useFilterValue("attendeeEmail", ZTextFilterValue);
  const bookingUid = useFilterValue("bookingUid", ZTextFilterValue)?.data?.operand as string | undefined;
  const utmSource = useFilterValue("utmSource", ZTextFilterValue)?.data?.operand as string | undefined;
  const utmMedium = useFilterValue("utmMedium", ZTextFilterValue)?.data?.operand as string | undefined;
  const utmCampaign = useFilterValue("utmCampaign", ZTextFilterValue)?.data?.operand as string | undefined;
  const utmTerm = useFilterValue("utmTerm", ZTextFilterValue)?.data?.operand as string | undefined;
  const utmContent = useFilterValue("utmContent", ZTextFilterValue)?.data?.operand as string | undefined;

  return {
    eventTypeIds,
    teamIds,
    userIds,
    dateRange,
    attendeeName,
    attendeeEmail,
    bookingUid,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
  };
}
