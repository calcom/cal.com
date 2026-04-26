"use client";

import { DataTableProvider } from "~/data-table/DataTableProvider";
import classNames from "@calcom/ui/classNames";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { BookingListContainer } from "../components/BookingListContainer";
import { useActiveFiltersValidator } from "../hooks/useActiveFiltersValidator";
import { useBookingsView } from "../hooks/useBookingsView";
import type { validStatuses } from "../lib/validStatuses";

const BookingCalendarContainer = dynamic(() =>
  import("../components/BookingCalendarContainer").then((mod) => ({
    default: mod.BookingCalendarContainer,
  }))
);

type BookingsProps = {
  status: (typeof validStatuses)[number];
  userId?: number;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
  bookingAuditEnabled: boolean;
};

export default function Bookings(props: BookingsProps) {
  const pathname = usePathname();
  const validateActiveFilters = useActiveFiltersValidator({
    canReadOthersBookings: props.permissions.canReadOthersBookings,
  });
  if (!pathname) return null;
  return (
    <DataTableProvider
      tableIdentifier={pathname}
      validateActiveFilters={validateActiveFilters}>
      <BookingsContent {...props} />
    </DataTableProvider>
  );
}

function BookingsContent({ status, permissions, bookingsV3Enabled, bookingAuditEnabled }: BookingsProps) {
  const [view] = useBookingsView({ bookingsV3Enabled });

  return (
    <div className={classNames(view === "calendar" && "-mb-8")}>
      {view === "list" && (
        <BookingListContainer
          status={status}
          permissions={permissions}
          bookingsV3Enabled={bookingsV3Enabled}
          bookingAuditEnabled={bookingAuditEnabled}
        />
      )}
      {bookingsV3Enabled && view === "calendar" && (
        <BookingCalendarContainer
          status={status}
          permissions={permissions}
          bookingsV3Enabled={bookingsV3Enabled}
        />
      )}
    </div>
  );
}
