import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useMemo, useRef, useCallback, useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import type { DateRange } from "@calcom/lib/date-ranges";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { Avatar, Badge, DataTable } from "@calcom/ui";

import { TBContext, createTimezoneBuddyStore } from "../store";
import { HoverOverview } from "./HoverOverview";
import { TimeDial } from "./TimeDial";

export interface SliderUser {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  dateRanges: DateRange[];
}

export function AvailabilitySliderTable() {
  const { data: session } = useSession();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();
  const [browsingDate, setBrowsingDate] = useState(dayjs());

  const { data, isLoading, fetchNextPage, isFetching } = trpc.viewer.availability.listTeam.useInfiniteQuery(
    {
      limit: 10,
      loggedInUsersTz: dayjs.tz.guess(), // fuck this find a better way
      startDate: browsingDate.startOf("day").toISOString(),
      endDate: browsingDate.endOf("day").toISOString(),
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      keepPreviousData: true,
    }
  );

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<SliderUser>[] = [
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
        cell: ({ row }) => {
          const { timeZone } = row.original;
          return <Badge>{timeZone}</Badge>;
        },
      },
      {
        id: "Time",
        header: "Time",
        cell: ({ row }) => {
          const { timeZone } = row.original;
          const time = dayjs().tz(timeZone).format("HH:mm");
          return <Badge>{time}</Badge>;
        },
      },
      {
        id: "slider",
        header: `${browsingDate.format("MMM DD, YYYY")}`,
        cell: ({ row }) => {
          const { timeZone, dateRanges } = row.original;
          // return <pre>{JSON.stringify(dateRanges, null, 2)}</pre>;
          return <TimeDial timezone={timeZone} dateRanges={dateRanges} />;
        },
      },
    ];

    return cols;
  }, [browsingDate, data]);

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]) as SliderUser[];
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
          "Pacific/Auckland",
          "Asia/Dubai",
          "Europe/Amsterdam",
          "America/Chicago",
          "Asia/Shanghai",
          "Asia/Kolkata",
          "America/Tijuana",
        ],
      })}>
      <div className="relative">
        <DataTable
          tableContainerRef={tableContainerRef}
          columns={memorisedColumns}
          data={flatData}
          isLoading={isLoading}
          tableOverlay={<HoverOverview />}
          onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
        />
      </div>
    </TBContext.Provider>
  );
}
