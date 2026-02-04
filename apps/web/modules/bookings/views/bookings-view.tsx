"use client";

import { ColumnFilterType, DataTableProvider, type SystemFilterSegment } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import FeatureOptInBannerWrapper from "@calcom/features/feature-opt-in/components/FeatureOptInBannerWrapper";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useFeatureOptInBanner } from "../../feature-opt-in/hooks/useFeatureOptInBanner";
import { BookingListContainer } from "../components/BookingListContainer";
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

function useSystemSegments(userId?: number) {
  const { t } = useLocale();

  const systemSegments: SystemFilterSegment[] = useMemo(() => {
    if (!userId) return [];

    return [
      {
        id: "my_bookings",
        name: t("my_bookings"),
        type: "system",
        activeFilters: [
          {
            f: "userId",
            v: {
              type: ColumnFilterType.MULTI_SELECT,
              data: [userId],
            },
          },
        ],
        perPage: 10,
      },
    ];
  }, [userId, t]);

  return systemSegments;
}

export default function Bookings(props: BookingsProps) {
  const pathname = usePathname();
  const systemSegments = useSystemSegments(props.userId);
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} systemSegments={systemSegments}>
      <BookingsContent {...props} />
    </DataTableProvider>
  );
}

function BookingsContent({ status, permissions, bookingsV3Enabled, bookingAuditEnabled }: BookingsProps) {
  const [view] = useBookingsView({ bookingsV3Enabled });
  const optInBanner = useFeatureOptInBanner("bookings-v3");

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
      <FeatureOptInBannerWrapper state={optInBanner} />
    </div>
  );
}
