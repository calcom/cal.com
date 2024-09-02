import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Trans } from "next-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, DataTable, EmptyScreen, Icon, showToast, SkeletonText, Tooltip } from "@calcom/ui";
import type { BookingRedirectForm } from "@calcom/web/pages/settings/my-account/out-of-office";

interface OutOfOfficeEntry {
  id: number;
  uuid: string;
  start: Date;
  end: Date;
  toUserId: number | null;
  toUser: {
    username: string;
  } | null;
  reason: {
    id: number;
    emoji: string;
    reason: string;
    userId: number;
  } | null;
  notes: string | null;
  user: { id: number; avatarUrl: string; username: string; email: string } | null;
}

export const OutOfOfficeEntriesListForTeam = ({
  editOutOfOfficeEntry,
  teamOOOEntriesUpdated,
}: {
  editOutOfOfficeEntry: (entry: BookingRedirectForm) => void;
  teamOOOEntriesUpdated: number;
}) => {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [deletedEntry, setDeletedEntry] = useState(0);
  const { data, isPending, fetchNextPage, isFetching, refetch } =
    trpc.viewer.outOfOfficeEntriesList.useInfiniteQuery(
      {
        limit: 10,
        fetchTeamMembersEntries: true,
        searchTerm: debouncedSearchTerm,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
      }
    );

  useEffect(() => {
    refetch();
  }, [teamOOOEntriesUpdated, deletedEntry, refetch]);

  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  //Flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(
    () => data?.pages?.flatMap((page) => page.rows) ?? [],
    [data]
  ) as OutOfOfficeEntry[];
  const totalFetched = flatData.length;

  const columns: ColumnDef<OutOfOfficeEntry>[] = [
    {
      id: "member",
      header: `Member`,
      cell: ({ row }) => {
        if (!row.original || !row.original.user) {
          return <SkeletonText className="h-8 w-full" />;
        }
        const { avatarUrl, username, email } = row.original.user;
        return (
          <div className="flex items-center gap-2">
            <Avatar
              size="sm"
              alt={username || email}
              imageSrc={getUserAvatarUrl({
                avatarUrl,
              })}
            />
            <div className="">
              <div
                data-testid={`member-${username}-username`}
                className="text-emphasis text-sm font-medium leading-none">
                {username || "No username"}
              </div>
              <div data-testid={`member-${username}-email`} className="text-subtle mt-1 text-sm leading-none">
                {email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "outOfOffice",
      header: `OutOfOffice (${totalDBRowCount})`,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <>
            {row.original ? (
              <div className="flex flex-row justify-between p-4">
                <div className="flex flex-row items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
                    {item?.reason?.emoji || "🏝️"}
                  </div>

                  <div className="ml-2 flex flex-col">
                    <p className="px-2 font-bold">
                      {dayjs.utc(item.start).format("ll")} - {dayjs.utc(item.end).format("ll")}
                    </p>
                    <p className="px-2">
                      {item.toUser?.username ? (
                        <Trans
                          i18nKey="ooo_forwarding_to"
                          values={{
                            username: item.toUser?.username,
                          }}
                          components={{
                            span: <span className="text-subtle font-bold" />,
                          }}
                        />
                      ) : (
                        <>{t("ooo_not_forwarding")}</>
                      )}
                    </p>
                    {item.notes && (
                      <p className="px-2">
                        <span className="text-subtle">{t("notes")}: </span>
                        <span data-testid={`ooo-entry-note-${item.toUser?.username || "n-a"}`}>
                          {item.notes}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-row items-center gap-x-2">
                  <Tooltip content={t("edit")}>
                    <Button
                      className="self-center rounded-lg border"
                      type="button"
                      color="minimal"
                      variant="icon"
                      data-testid={`ooo-edit-${item.toUser?.username || "n-a"}`}
                      StartIcon="pencil"
                      onClick={() => {
                        const outOfOfficeEntryData: BookingRedirectForm = {
                          uuid: item.uuid,
                          dateRange: {
                            startDate: item.start,
                            endDate: dayjs(item.end).subtract(1, "d").toDate(),
                          },
                          offset: dayjs().utcOffset(),
                          toTeamUserId: item.toUserId,
                          reasonId: item.reason?.id ?? 1,
                          notes: item.notes ?? undefined,
                          forUserId: item.user?.id || null,
                        };
                        editOutOfOfficeEntry(outOfOfficeEntryData);
                      }}
                    />
                  </Tooltip>
                  <Tooltip content={t("delete")}>
                    <Button
                      className="self-center rounded-lg border"
                      type="button"
                      color="minimal"
                      variant="icon"
                      disabled={deleteOutOfOfficeEntryMutation.isPending}
                      StartIcon="trash-2"
                      onClick={() => {
                        deleteOutOfOfficeEntryMutation.mutate({
                          outOfOfficeUid: item.uuid,
                          userId: item.user?.id,
                        });
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
            ) : (
              <SkeletonText className="h-8 w-full" />
            )}
          </>
        );
      },
    },
  ];

  if (tableContainerRef.current) {
    tableContainerRef.current.style.height = "736px";
    tableContainerRef.current.style.overflowAnchor = "none";
    tableContainerRef.current.classList.add("overflow-auto");
  }

  //called on scroll to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 100px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 100 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
        if (isFetching) {
          containerRefElement.classList.add("cursor-wait");
        } else {
          containerRefElement.classList.remove("cursor-wait");
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const deleteOutOfOfficeEntryMutation = trpc.viewer.outOfOfficeEntryDelete.useMutation({
    onSuccess: () => {
      showToast(t("success_deleted_entry_out_of_office"), "success");
      setDeletedEntry((previousValue) => previousValue + 1);
      useFormState;
    },
    onError: () => {
      showToast(`An error ocurred`, "error");
    },
  });
  if (
    data === null ||
    (data?.pages?.length !== 0 && data?.pages[0].meta.totalRowCount === 0 && debouncedSearchTerm === "") ||
    (data === undefined && !isPending)
  )
    return (
      <EmptyScreen
        className="mt-6"
        headline={t("ooo_team_empty_title")}
        description={t("ooo_team_empty_description")}
        customIcon={
          <div className="mt-4 h-[102px]">
            <div className="flex h-full flex-col items-center justify-center p-2 md:mt-0 md:p-0">
              <div className="relative">
                <div className="dark:bg-darkgray-50 absolute -left-3 -top-3 -z-20 h-[70px] w-[70px] -rotate-[24deg] rounded-3xl border-2 border-[#e5e7eb] p-8 opacity-40 dark:opacity-80">
                  <div className="w-12" />
                </div>
                <div className="dark:bg-darkgray-50 absolute -top-3 left-3 -z-10 h-[70px] w-[70px] rotate-[24deg] rounded-3xl border-2 border-[#e5e7eb] p-8 opacity-60 dark:opacity-90">
                  <div className="w-12" />
                </div>
                <div className="dark:bg-darkgray-50 relative z-0 flex h-[70px] w-[70px] items-center justify-center rounded-3xl border-2 border-[#e5e7eb] bg-white">
                  <Icon name="clock" size={28} />
                  <div className="dark:bg-darkgray-50 absolute right-4 top-5 h-[12px] w-[12px] rotate-[56deg] bg-white text-lg font-bold" />
                  <span className="absolute right-4 top-3 font-sans text-sm font-extrabold">z</span>
                </div>
              </div>
            </div>
          </div>
        }
      />
    );
  return (
    <div>
      <DataTable
        data-testid="ooo-team-list-data-table"
        onSearch={(value) => setDebouncedSearchTerm(value)}
        tableContainerRef={tableContainerRef}
        columns={columns}
        data={isPending || (isFetching && debouncedSearchTerm !== "") ? new Array(5).fill(null) : flatData}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
      />
    </div>
  );
};
