"use client";

import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, getFilteredRowModel, useReactTable } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dayjs from "@calcom/dayjs";
import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import { DataTable, DataTableToolbar } from "@calcom/features/data-table/components";
import { useDataTable } from "@calcom/features/data-table/hooks";
import type { DateRange } from "@calcom/features/schedules/lib/date-ranges";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { UserProfile } from "@calcom/types/UserProfile";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";

import { UpgradeTip } from "../../tips/UpgradeTip";
import { createTimezoneBuddyStore, TBContext } from "../store";
import { AvailabilityEditSheet } from "./AvailabilityEditSheet";
import { CellHighlightContainer } from "./CellHighlightContainer";
import { TimeDial } from "./TimeDial";

export interface SliderUser {
  id: number;
  username: string | null;
  name: string | null;
  organizationId: number;
  avatarUrl: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  defaultScheduleId: number | null;
  dateRanges: DateRange[];
  profile: UserProfile;
}

function UpgradeTeamTip() {
  const { t } = useLocale();

  return (
    <UpgradeTip
      plan="team"
      title={t("calcom_is_better_with_team", { appName: APP_NAME }) as string}
      description={t("add_your_team_members")}
      background="/tips/teams"
      features={[]}
      buttons={
        <div className="stack-y-2 rtl:space-x-reverse sm:space-x-2">
          <ButtonGroup>
            <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
              {t("create_team")}
            </Button>
            <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
              {t("learn_more")}
            </Button>
          </ButtonGroup>
        </div>
      }>
      <></>
    </UpgradeTip>
  );
}

export function AvailabilitySliderTable(props: { isOrg: boolean }) {
  const pathname = usePathname();
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname}>
      <AvailabilitySliderTableContent {...props} />
    </DataTableProvider>
  );
}

function AvailabilitySliderTableContent(props: { isOrg: boolean }) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [browsingDate, setBrowsingDate] = useState(dayjs());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SliderUser | null>(null);
  const { searchTerm } = useDataTable();

  const { data, isPending, fetchNextPage, isFetching } = trpc.viewer.availability.listTeam.useInfiniteQuery(
    {
      limit: 10,
      loggedInUsersTz: CURRENT_TIMEZONE,
      startDate: browsingDate.startOf("day").toISOString(),
      endDate: browsingDate.endOf("day").toISOString(),
      searchString: searchTerm,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<SliderUser>[] = [
      {
        id: "member",
        accessorFn: (data) => data.username,
        enableHiding: false,
        enableSorting: false,
        header: "Member",
        size: 200,
        cell: ({ row }) => {
          const { username, email, timeZone, name, avatarUrl, profile } = row.original;
          return (
            <div className="max-w-64 flex shrink-0 items-center gap-2 overflow-hidden">
              <UserAvatar
                size="sm"
                user={{
                  username,
                  name,
                  avatarUrl,
                  profile,
                }}
              />
              <div className="">
                <div className="text-emphasis max-w-64 truncate text-sm font-medium" title={email}>
                  {username || "No username"}
                </div>
                <div className="text-subtle text-xs leading-none">{timeZone}</div>
              </div>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          return row.original.username?.toLowerCase().includes(value.toLowerCase()) || false;
        },
      },
      {
        id: "timezone",
        accessorFn: (data) => data.timeZone,
        header: "Timezone",
        enableHiding: false,
        enableSorting: false,
        size: 160,
        cell: ({ row }) => {
          const { timeZone } = row.original;
          const timeRaw = dayjs().tz(timeZone);
          const time = timeRaw.format("HH:mm");
          const utcOffsetInMinutes = timeRaw.utcOffset();
          const hours = Math.abs(Math.floor(utcOffsetInMinutes / 60));
          const minutes = Math.abs(utcOffsetInMinutes % 60);
          const offsetFormatted = `${utcOffsetInMinutes < 0 ? "-" : "+"}${hours
            .toString()
            .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

          return (
            <div className="flex flex-col text-center">
              <span className="text-default text-sm font-medium">{time}</span>
              <span className="text-subtle text-xs leading-none">GMT {offsetFormatted}</span>
            </div>
          );
        },
      },
      {
        id: "slider",
        meta: {
          autoWidth: true,
        },
        enableHiding: false,
        enableSorting: false,
        header: () => {
          return (
            <div className="flex items-center space-x-2">
              <ButtonGroup containerProps={{ className: "space-x-0" }}>
                <Button
                  color="minimal"
                  variant="icon"
                  StartIcon="chevron-left"
                  onClick={() => setBrowsingDate(browsingDate.subtract(1, "day"))}
                />
                <Button
                  onClick={() => setBrowsingDate(browsingDate.add(1, "day"))}
                  color="minimal"
                  StartIcon="chevron-right"
                  variant="icon"
                />
              </ButtonGroup>
              <span>{browsingDate.format("LL")}</span>
            </div>
          );
        },
        cell: ({ row }) => {
          const { timeZone, dateRanges } = row.original;
          // return <pre>{JSON.stringify(dateRanges, null, 2)}</pre>;
          return <TimeDial timezone={timeZone} dateRanges={dateRanges} />;
        },
      },
    ];

    return cols;
  }, [browsingDate]);

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]) as SliderUser[];
  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const table = useReactTable({
    data: flatData,
    columns: memorisedColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // This means they are not apart of any teams so we show the upgrade tip
  if (!flatData.length && !data?.pages?.[0]?.meta?.isApartOfAnyTeam) return <UpgradeTeamTip />;

  return (
    <TBContext.Provider
      value={createTimezoneBuddyStore({
        browsingDate: browsingDate.toDate(),
      })}>
      <>
        <CellHighlightContainer>
          <DataTable
            table={table}
            tableContainerRef={tableContainerRef}
            onRowMouseclick={(row) => {
              if (props.isOrg) {
                setEditSheetOpen(true);
                setSelectedUser(row.original);
              }
            }}
            isPending={isPending}
            onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
            <DataTableToolbar.Root>
              <DataTableToolbar.SearchBar />
            </DataTableToolbar.Root>
          </DataTable>
        </CellHighlightContainer>
        {selectedUser && editSheetOpen ? (
          <AvailabilityEditSheet
            open={editSheetOpen}
            onOpenChange={(e) => {
              setEditSheetOpen(e);
              setSelectedUser(null); // We need to clear the user here or else the sheet will not re-render when opening a new user
            }}
            selectedUser={selectedUser}
          />
        ) : null}
      </>
    </TBContext.Provider>
  );
}
