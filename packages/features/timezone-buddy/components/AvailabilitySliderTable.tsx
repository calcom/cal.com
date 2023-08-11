import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useMemo, useRef, useCallback, useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Avatar, Badge, DataTable } from "@calcom/ui";

import { TBContext, createTimezoneBuddyStore } from "../store";
import { TimeDial } from "./TimeDial";

export interface User {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
}

export function AvailabilitySliderTable() {
  const { data: session } = useSession();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();
  const [browsingDate, setBrowsingDate] = useState(dayjs());

  const { data, isLoading, fetchNextPage, isFetching } =
    trpc.viewer.organizations.listMembers.useInfiniteQuery(
      {
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
      }
    );

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<User>[] = [
      {
        id: "member",
        accessorFn: (data) => data.email,
        header: "Member",
        cell: ({ row }) => {
          const { username, email } = row.original;
          return (
            <div className="max-w-64 flex flex-shrink-0 items-center gap-2 overflow-hidden">
              <Avatar
                size="sm"
                alt={username || email}
                imageSrc={"/" + username + "/avatar.png"}
                gravatarFallbackMd5="fallback"
              />
              <div className="">
                <div className="text-emphasis max-w-64 truncate text-sm font-medium leading-none ">
                  {username || "No username"}
                </div>
                <div className="text-subtle text-sm leading-none">{email}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: "timezone",
        accessorFn: (data) => data.timeZone,
        header: "Timezone",
        cell: ({ row, table }) => {
          const { timeZone } = row.original;
          return <Badge>{timeZone}</Badge>;
        },
      },
      {
        id: "Time",
        header: "Time",
        cell: ({ row, table }) => {
          const { timeZone } = row.original;
          const time = dayjs().tz(timeZone).format("HH:mm");
          return <Badge>{time}</Badge>;
        },
      },
      {
        id: "slider",
        header: `${browsingDate.format("MMM DD, YYYY")}`,
        cell: ({ row, table }) => {
          const { timeZone } = row.original;
          return <TimeDial timezone={timeZone} />;
        },
      },
    ];

    return cols;
  }, []);

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]) as User[];
  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  return (
    <TBContext.Provider
      value={createTimezoneBuddyStore({
        browsingDate: browsingDate.toDate(),
        uniquedTimezones: [
          "America/New_York",
          "America/Los_Angeles",
          "Europe/London",
          "Asia/Tokyo",
          "Africa/Cairo",
          "Australia/Sydney",
          "Australia/Sydney",
          "Australia/Sydney",
          "Australia/Sydney",
          "Pacific/Auckland",
          "Asia/Dubai",
          "Europe/Paris",
          "America/Chicago",
          "Asia/Shanghai",
        ],
      })}>
      <DataTable
        tableContainerRef={tableContainerRef}
        columns={memorisedColumns}
        data={flatData}
        isLoading={isLoading}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
      />
    </TBContext.Provider>
  );
}
