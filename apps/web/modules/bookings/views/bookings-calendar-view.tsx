"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import type { validStatuses } from "~/bookings/lib/validStatuses";

type BookingListingStatus = (typeof validStatuses)[number];

type BookingsCalendarViewProps = {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
};

export function BookingsCalendarView(_props: BookingsCalendarViewProps) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-center pt-2 xl:pt-0">
      <EmptyScreen
        Icon="calendar"
        headline={t("calendar_view_coming_soon")}
        description={t("calendar_view_coming_soon_description")}
      />
    </div>
  );
}
