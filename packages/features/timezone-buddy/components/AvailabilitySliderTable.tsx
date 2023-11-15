import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useRef, useCallback, useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import type { DateRange } from "@calcom/lib/date-ranges";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { Button, ButtonGroup, DataTable } from "@calcom/ui";
import { UserAvatar } from "@calcom/web/components/ui/avatar/UserAvatar";

import { UpgradeTip } from "../../tips/UpgradeTip";
import { TBContext, createTimezoneBuddyStore } from "../store";
import { AvailabilityEditSheet } from "./AvailabilityEditSheet";
import { TimeDial } from "./TimeDial";

export interface SliderUser {
  id: number;
  username: string | null;
  name: string | null;
  organizationId: number;
  email: string;
  timeZone: string;
  role: MembershipRole;
  defaultScheduleId: number | null;
  dateRanges: DateRange[];
}

function UpgradeTeamTip() {
  const { t } = useLocale();

  return (
    <UpgradeTip
      plan="team"
      title={t("calcom_is_better_with_team", { appName: APP_NAME }) as string}
      description="add_your_team_members"
      background="/tips/teams"
      features={[]}
      buttons={
        <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
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

export function AvailabilitySliderTable() {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [browsingDate, setBrowsingDate] = useState(dayjs());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SliderUser | null>(null);

  const { data, isLoading, fetchNextPage, isFetching } = trpc.viewer.availability.listTeam.useInfiniteQuery(
    {
      limit: 10,
      loggedInUsersTz: dayjs.tz.guess() || "Europe/London",
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
          const { username, email, timeZone, name, organizationId } = row.original;
          return (
            <div className="max-w-64 flex flex-shrink-0 items-center gap-2 overflow-hidden">
              <UserAvatar
                size="sm"
                user={{
                  username,
                  name,
                  organizationId,
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
      },
      {
        id: "timezone",
        accessorFn: (data) => data.timeZone,
        header: "Timezone",
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
        header: () => {
          return (
            <div className="flex items-center">
              <ButtonGroup containerProps={{ className: "space-x-0" }}>
                <Button
                  color="minimal"
                  variant="icon"
                  StartIcon={ChevronLeftIcon}
                  onClick={() => setBrowsingDate(browsingDate.subtract(1, "day"))}
                />
                <Button
                  onClick={() => setBrowsingDate(browsingDate.add(1, "day"))}
                  color="minimal"
                  StartIcon={ChevronRightIcon}
                  variant="icon"
                />
              </ButtonGroup>
              <span>{browsingDate.format("DD dddd MMM, YYYY")}</span>
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

  // This means they are not apart of any teams so we show the upgrade tip
  if (!flatData.length) return <UpgradeTeamTip />;

  return (
    <TBContext.Provider
      value={createTimezoneBuddyStore({
        browsingDate: browsingDate.toDate(),
      })}>
      <>
        <div className="relative">
          <DataTable
            searchKey="member"
            tableContainerRef={tableContainerRef}
            columns={memorisedColumns}
            onRowMouseclick={(row) => {
              setEditSheetOpen(true);
              setSelectedUser(row.original);
            }}
            data={flatData}
            isLoading={isLoading}
            // tableOverlay={<HoverOverview />}
            onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
          />
        </div>
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
