"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { useMemo } from "react";

import { DataTableProvider, type SystemFilterSegment, ColumnFilterType } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import { BookingListContainer } from "../components/BookingListContainer";
import type { validStatuses } from "../lib/validStatuses";
import { viewParser } from "../lib/viewParser";

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

function BookingsContent({ status, permissions, bookingsV3Enabled }: BookingsProps) {
  const [_view] = useQueryState("view", viewParser.withDefault("list"));
  // Force view to be "list" if calendar view is disabled
  const view = bookingsV3Enabled ? _view : "list";

  return (
    <div className={classNames(view === "calendar" && "-mb-8")}>
      {view === "list" && (
        <BookingListContainer
          status={status}
          permissions={permissions}
          bookingsV3Enabled={bookingsV3Enabled}
        />
      )}
      {bookingsV3Enabled && view === "calendar" && (
        <BookingCalendarContainer status={status} permissions={permissions} />
      )}
    </div>
  );
}
