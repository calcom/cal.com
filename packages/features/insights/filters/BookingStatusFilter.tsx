import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { Icon, FilterSelect } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type BookingStatusOption = {
  value: BookingStatus | "NO_BOOKING";
  label: string;
};

export const BookingStatusFilter = () => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedBookingStatus, selectedFilter } = filter;

  const bookingStatusOptions = useMemo(() => {
    const options: BookingStatusOption[] = Object.values(BookingStatus).map((status) => ({
      value: status,
      label: t(`${status.toLowerCase()}`).charAt(0).toUpperCase() + t(`${status.toLowerCase()}`).slice(1),
    }));

    options.push({
      value: "NO_BOOKING",
      label: t("no_booking"),
    });

    return options;
  }, [t]);

  if (!selectedFilter?.includes("booking_status")) {
    return null;
  }

  return (
    <FilterSelect
      title={t("routing_form_insights_booking_status")}
      options={bookingStatusOptions}
      selectedValue={selectedBookingStatus}
      onChange={(value) => {
        setConfigFilters({ selectedBookingStatus: value as BookingStatus | "NO_BOOKING" });
      }}
      buttonIcon={<Icon name="circle" className="mr-2 h-4 w-4" />}
      placeholder={t("search")}
    />
  );
};
