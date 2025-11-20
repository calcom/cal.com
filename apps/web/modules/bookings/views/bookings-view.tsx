"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { useMemo } from "react";

import { DataTableProvider, type SystemFilterSegment, ColumnFilterType } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";

import { BookingsListContainer } from "../components/BookingsListContainer";
import { ViewToggleButton } from "../components/ViewToggleButton";
import type { validStatuses } from "../lib/validStatuses";
import { viewParser } from "../lib/viewParser";

const BookingsCalendarContainer = dynamic(() =>
  import("../components/BookingsCalendarContainer").then((mod) => ({
    default: mod.BookingsCalendarContainer,
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
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabOptions = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        value: "upcoming",
        label: "upcoming",
        path: "/bookings/upcoming",
        dataTestId: "upcoming",
      },
      {
        value: "unconfirmed",
        label: "unconfirmed",
        path: "/bookings/unconfirmed",
        dataTestId: "unconfirmed",
      },
      {
        value: "recurring",
        label: "recurring",
        path: "/bookings/recurring",
        dataTestId: "recurring",
      },
      {
        value: "past",
        label: "past",
        path: "/bookings/past",
        dataTestId: "past",
      },
      {
        value: "cancelled",
        label: "cancelled",
        path: "/bookings/cancelled",
        dataTestId: "cancelled",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      value: tabConfig.value,
      label: t(tabConfig.label),
      dataTestId: tabConfig.dataTestId,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
    }));
  }, [searchParams, t]);

  const currentTab = useMemo(() => {
    const pathMatch = pathname?.match(/\/bookings\/(\w+)/);
    return pathMatch?.[1] || "upcoming";
  }, [pathname]);

  return (
    <div className="flex flex-col">
      {view === "list" && (
        <div className="mb-4 flex flex-row flex-wrap justify-between lg:mb-5">
          <ToggleGroup
            value={currentTab}
            onValueChange={(value) => {
              if (!value) return;
              const selectedTab = tabOptions.find((tab) => tab.value === value);
              if (selectedTab?.href) {
                router.push(selectedTab.href);
              }
            }}
            options={tabOptions}
          />
          {bookingsV3Enabled && <ViewToggleButton />}
        </div>
      )}
      <main className="w-full">
        <div className="flex w-full flex-col">
          {view === "list" && (
            <BookingsListContainer
              status={status}
              permissions={permissions}
              enableDetailsSheet={bookingsV3Enabled}
            />
          )}
          {bookingsV3Enabled && view === "calendar" && (
            <BookingsCalendarContainer status={status} permissions={permissions} />
          )}
        </div>
      </main>
    </div>
  );
}
