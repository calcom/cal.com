"use client";

import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, getFilteredRowModel, useReactTable } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dayjs from "@calcom/dayjs";
import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import { DataTable, DataTableToolbar } from "@calcom/features/data-table/components";
import { useDataTable } from "@calcom/features/data-table/hooks";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import type { DateRange } from "@calcom/lib/date-ranges";
// import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
// import type { MembershipRole } from "@calcom/prisma/enums";
import type { CalIdMembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { UserProfile } from "@calcom/types/UserProfile";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { Checkbox } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { GroupMeetingDialog } from "../../../../apps/web/components/dialog/GroupMeetingDialog";
import { UpgradeTip } from "../../tips/UpgradeTip";
import { createTimezoneBuddyStore, TBContext } from "../store";
import { AvailabilityEditSheet } from "./AvailabilityEditSheet";
import { CellHighlightContainer } from "./CellHighlightContainer";
import { TimeDial } from "./TimeDial";

export interface SliderUser {
  id: number;
  username: string | null;
  name: string | null;
  organizationId: number | null;
  avatarUrl?: string | null;
  email: string;
  timeZone: string;
  // role: MembershipRole;
  role: CalIdMembershipRole;
  defaultScheduleId: number | null;
  dateRanges: DateRange[];
  profile?: UserProfile;
  teamName?: string[];
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
        <div className="space-y-2 sm:space-x-2 rtl:space-x-reverse">
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

const MoreOptions: React.FC<{
  user: SliderUser;
  setEditSheetOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedUser: Dispatch<SetStateAction<SliderUser | null>>;
}> = ({ user, setEditSheetOpen, setSelectedUser }) => {
  const { t } = useLocale();
  return (
    <div>
      <Tooltip content={t("view_schedule")}>
        <Button
          type="button"
          variant="icon"
          color="secondary"
          onClick={(e) => {
            setEditSheetOpen(true);
            setSelectedUser(user);
            e.stopPropagation();
          }}
          className="ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md">
          <Icon name="calendar" className="h-6 w-6 dark:text-white" aria-hidden="true" />
        </Button>
      </Tooltip>
    </div>
  );
};

export function AvailabilitySliderTable(props: { isOrg: boolean }) {
  return (
    <DataTableProvider>
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
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [isOpenDialog, setIsOpenDialog] = useState<boolean>(false);

  const tbStore = createTimezoneBuddyStore({
    browsingDate: browsingDate.toDate(),
  });

  // const { data, isPending, fetchNextPage, isFetching } = trpc.viewer.availability.listTeam.useInfiniteQuery(
  const { data, isPending, fetchNextPage, isFetching } =
    trpc.viewer.calidTeams.calidListTeam.useInfiniteQuery(
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

  // Merge duplicate users by username and aggregate team names
  const [flatData, totalFetched] = useMemo(() => {
    const userMap = new Map<string, SliderUser>();
    const originalData = data?.pages?.flatMap((page) => page.rows) ?? [];
    const totalFetched = originalData.length;

    originalData.forEach((user) => {
      const username = user.username || "unknown";
      if (userMap.has(username)) {
        const existingUser = userMap.get(username) as SliderUser;
        if (!existingUser.teamName) existingUser.teamName = [];
        existingUser.teamName.push(user.teamName); // Add team name if available
      } else {
        userMap.set(username, {
          ...user,
          teamName: [user.teamName],
        });
      }
    });

    return [Array.from(userMap.values()), totalFetched] as [SliderUser[], number];
  }, [data]);

  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;

  // Handle member selection
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        const allUsernames = flatData.map((user) => user.username).filter(Boolean) as string[];
        setSelectedMembers(allUsernames);
      } else {
        setSelectedMembers([]);
      }
    },
    [flatData]
  );

  const handleSelectMember = (username: string | null) => {
    if (!username) return;
    setSelectedMembers((prevSelected) =>
      prevSelected.includes(username)
        ? prevSelected.filter((member) => member !== username)
        : [...prevSelected, username]
    );
  };

  const handleBookMembers = () => {
    if (selectedMembers.length === 0) {
      showToast("Please select at least one member", "error");
      return;
    }
    const url = `${WEBAPP_URL}/${selectedMembers.join("+")}`;
    setMeetingUrl(url);
    setIsOpenDialog(true);
  };

  const { t } = useLocale();

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<SliderUser>[] = [
      {
        id: "select",
        size: 40,
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => {
          return (
            <div className="max-w-32">
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => {
                  handleSelectAll(!!value);
                  table.toggleAllPageRowsSelected(!!value);
                }}
                aria-label="Select all"
                className="translate-y-[2px] border border-gray-800 dark:border-gray-500 "
              />
            </div>
          );
        },
        cell: ({ row }) => {
          return (
            <div className="max-w-32">
              <Checkbox
                checked={row.getIsSelected()}
                aria-label="Select row"
                className="translate-y-[2px] border border-gray-800 dark:border-gray-500 "
              />
            </div>
          );
        },
      },
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
            <div className="flex max-w-64 flex-shrink-0 items-center gap-2 overflow-hidden">
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
        id: "memberships",
        accessorFn: (data) => data.teamName,
        header: "More",
        size: 100,
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <MoreOptions
              user={row.original}
              setEditSheetOpen={setEditSheetOpen}
              setSelectedUser={setSelectedUser}
            />
          );
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
        size: 45 * 24 + 49,
        meta: {
          autoWidth: false,
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
          return <TimeDial timezone={timeZone} dateRanges={dateRanges} />;
        },
      },
    ];

    return cols;
  }, [browsingDate, handleSelectAll]);

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
        <GroupMeetingDialog isOpenDialog={isOpenDialog} setIsOpenDialog={setIsOpenDialog} link={meetingUrl} />
        <DataTableToolbar.Root>
          <div className="flex items-center justify-between gap-2">
            <DataTableToolbar.SearchBar />
            <Button type="button" color="primary" onClick={handleBookMembers} className="rounded-md">
              {t("book_members")}
            </Button>
          </div>
        </DataTableToolbar.Root>

        <CellHighlightContainer>
          <DataTable
            table={table}
            tableContainerRef={tableContainerRef}
            onRowMouseclick={(row) => {
              // if (props.isOrg) {
              const { username } = row.original;
              handleSelectMember(username);
              row.toggleSelected();
              // }
            }}
            isPending={isPending}
            onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
            {/* <DataTableToolbar.Root>
              <div className="flex items-center gap-2">
                <DataTableToolbar.SearchBar />
                <Button type="button" color="primary" onClick={handleBookMembers}>
                  {t("book_members")}
                 
                </Button>
              </div>
            </DataTableToolbar.Root>  */}
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
