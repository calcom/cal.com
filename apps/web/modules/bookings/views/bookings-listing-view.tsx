"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { createParser, useQueryState } from "nuqs";
import { useMemo } from "react";

import { DataTableProvider, type SystemFilterSegment } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { HorizontalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

import type { validStatuses } from "~/bookings/lib/validStatuses";

import { BookingsCalendarView } from "./bookings-calendar-view";
import { BookingsListView } from "./bookings-list-view";

type BookingsProps = {
  status: (typeof validStatuses)[number];
  userId?: number;
  permissions: {
    canReadOthersBookings: boolean;
  };
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
  return (
    <DataTableProvider
      useSegments={useSegments}
      systemSegments={systemSegments}
      tableIdentifier={pathname || undefined}>
      <BookingsContent {...props} />
    </DataTableProvider>
  );
}

const viewParser = createParser({
  parse: (value: string) => {
    if (value === "calendar") return "calendar";
    return "list";
  },
  serialize: (value: "list" | "calendar") => value,
});

function BookingsContent({ status, permissions }: BookingsProps) {
  const [view] = useQueryState("view", viewParser.withDefault("list"));
  const { t } = useLocale();
  const searchParams = useSearchParams();

  // Generate dynamic tabs that preserve query parameters
  const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        name: "upcoming",
        path: "/bookings/upcoming",
        "data-testid": "upcoming",
      },
      {
        name: "unconfirmed",
        path: "/bookings/unconfirmed",
        "data-testid": "unconfirmed",
      },
      {
        name: "recurring",
        path: "/bookings/recurring",
        "data-testid": "recurring",
      },
      {
        name: "past",
        path: "/bookings/past",
        "data-testid": "past",
      },
      {
        name: "cancelled",
        path: "/bookings/cancelled",
        "data-testid": "cancelled",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      name: tabConfig.name,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
      "data-testid": tabConfig["data-testid"],
    }));
  }, [searchParams]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-row flex-wrap justify-between">
        <HorizontalTabs
          tabs={tabs.map((tab) => ({
            ...tab,
            name: t(tab.name),
          }))}
        />
      </div>
      <main className="w-full">
        <div className="flex w-full flex-col">
          {view === "list" ? (
            <BookingsListView status={status} permissions={permissions} />
          ) : (
            <BookingsCalendarView status={status} permissions={permissions} />
          )}
        </div>
      </main>
    </div>
  );
}
