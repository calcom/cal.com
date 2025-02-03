"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useReducer, useRef, useState } from "react";

import {
  DataTableProvider,
  DataTable,
  DataTableToolbar,
  DataTableFilters,
  DataTableSelectionBar,
  DataTablePagination,
  useColumnFilters,
  useFetchMoreOnBottomReached,
} from "@calcom/features/data-table";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Avatar, Badge, Checkbox, SkeletonText } from "@calcom/ui";

import { DeleteBulkUsers } from "./BulkActions/DeleteBulkUsers";
import { DeleteMemberModal } from "./DeleteMemberModal";
import type { UserTableState, UserTableAction, PlatformManagedUserTableUser } from "./types";

const initialState: UserTableState = {
  changeMemberRole: {
    showModal: false,
  },
  deleteMember: {
    showModal: false,
  },
  impersonateMember: {
    showModal: false,
  },
  inviteMember: {
    showModal: false,
  },
  editSheet: {
    showModal: false,
  },
};

const initalColumnVisibility = {
  select: true,
  member: true,
  role: true,
  teams: true,
  actions: true,
};

type PlatformManagedUsersTableProps = {
  oAuthClientId: string;
};

export function PlatformManagedUsersTable(props: PlatformManagedUsersTableProps) {
  return (
    <DataTableProvider>
      <UserListTableContent {...props} />
    </DataTableProvider>
  );
}

function UserListTableContent({ oAuthClientId }: PlatformManagedUsersTableProps) {
  const { t } = useLocale();

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [state, dispatch] = useReducer(reducer, initialState);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const columnFilters = useColumnFilters();

  const { data, isPending, hasNextPage, fetchNextPage, isFetching } =
    trpc.viewer.organizations.listMembers.useInfiniteQuery(
      {
        limit: 30,
        searchTerm: debouncedSearchTerm,
        filters: columnFilters,
        oAuthClientId,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        enabled: !!oAuthClientId,
      }
    );

  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(
    () => data?.pages?.flatMap((page) => page.rows) ?? [],
    [data]
  ) as PlatformManagedUserTableUser[];

  const columns = useMemo(() => {
    const cols: ColumnDef<PlatformManagedUserTableUser>[] = [
      // Disabling select for this PR: Will work on actions etc in a follow up
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        size: 30,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
      },
      {
        id: "member",
        accessorFn: (data) => data.email,
        enableHiding: false,
        size: 200,
        header: () => {
          return `Managed Users`;
        },
        cell: ({ row }) => {
          if (isPending) {
            return <SkeletonText className="h-6 w-1/4" />;
          }
          const { username, email, avatarUrl } = row.original;
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
                <div
                  data-testid={`member-${username}-email`}
                  className="text-subtle mt-1 text-sm leading-none">
                  {email}
                </div>
              </div>
            </div>
          );
        },
        filterFn: (rows, id, filterValue) => {
          const userEmail = rows.original.email;
          return filterValue.includes(userEmail);
        },
      },
      {
        id: "role",
        accessorFn: (data) => data.role,
        header: "Role",
        size: 100,
        cell: ({ row, table }) => {
          if (isPending) {
            return <SkeletonText className="h-6 w-1/4" />;
          }
          const { role, username } = row.original;
          return (
            <Badge
              data-testid={`member-${username}-role`}
              variant={role === "MEMBER" ? "gray" : "blue"}
              onClick={() => {
                table.getColumn("role")?.setFilterValue([role]);
              }}>
              {role}
            </Badge>
          );
        },
        filterFn: (rows, id, filterValue) => {
          if (filterValue.includes("PENDING")) {
            if (filterValue.length === 1) return !rows.original.accepted;
            else return !rows.original.accepted || filterValue.includes(rows.getValue(id));
          }

          // Show only the selected roles
          return filterValue.includes(rows.getValue(id));
        },
      },
      {
        id: "teams",
        accessorFn: (data) => data.teams.map((team) => team.name),
        header: "Teams",
        size: 140,
        cell: ({ row, table }) => {
          if (isPending) {
            return <SkeletonText className="h-6 w-1/4" />;
          }
          const { teams, accepted, email, username } = row.original;
          // TODO: Implement click to filter
          return (
            <div className="flex h-full flex-wrap items-center gap-2">
              {accepted ? null : (
                <Badge
                  data-testid2={`member-${username}-pending`}
                  variant="red"
                  className="text-xs"
                  data-testid={`email-${email.replace("@", "")}-pending`}
                  onClick={() => {
                    table.getColumn("role")?.setFilterValue(["PENDING"]);
                  }}>
                  Pending
                </Badge>
              )}

              {teams.map((team) => (
                <Badge
                  key={team.id}
                  variant="gray"
                  onClick={() => {
                    table.getColumn("teams")?.setFilterValue([team.name]);
                  }}>
                  {team.name}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (rows, _, filterValue: string[]) => {
          const teamNames = rows.original.teams.map((team) => team.name);
          return filterValue.some((value: string) => teamNames.includes(value));
        },
      },
    ];
    return cols;
  }, [isPending]);

  const table = useReactTable({
    data: flatData,
    columns,
    enableRowSelection: true,
    debugTable: true,
    manualPagination: true,
    initialState: {
      columnVisibility: initalColumnVisibility,
      columnPinning: {
        left: ["select", "member"],
      },
    },
    defaultColumn: {
      size: 150,
    },
    state: {
      columnFilters,
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => `${row.id}`,
  });

  function reducer(state: UserTableState, action: UserTableAction): UserTableState {
    switch (action.type) {
      case "SET_CHANGE_MEMBER_ROLE_ID":
        return { ...state, changeMemberRole: action.payload };
      case "SET_DELETE_ID":
        return { ...state, deleteMember: action.payload };
      case "SET_IMPERSONATE_ID":
        return { ...state, impersonateMember: action.payload };
      case "INVITE_MEMBER":
        return { ...state, inviteMember: action.payload };
      case "EDIT_USER_SHEET":
        return { ...state, editSheet: action.payload };
      case "CLOSE_MODAL":
        return {
          ...state,
          changeMemberRole: { showModal: false },
          deleteMember: { showModal: false },
          impersonateMember: { showModal: false },
          inviteMember: { showModal: false },
          editSheet: { showModal: false },
        };
      default:
        return state;
    }
  }

  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  const numberOfSelectedRows = useMemo(() => table.getSelectedRowModel().rows.length, [table]);

  return (
    <>
      <DataTable
        testId="managed-user-list-data-table"
        table={table}
        tableContainerRef={tableContainerRef}
        isPending={isPending}
        enableColumnResizing={true}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
        <DataTableToolbar.Root>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
              <DataTableToolbar.SearchBar
                table={table}
                onSearch={(value) => setDebouncedSearchTerm(value)}
                className="sm:max-w-64 max-w-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* We have to omit member because we don't want the filter to show but we can't disable filtering as we need that for the search bar */}
              <DataTableFilters.AddFilterButton table={table} />
              <DataTableFilters.ColumnVisibilityButton table={table} />
            </div>
          </div>
          <div className="flex gap-2 justify-self-start">
            <DataTableFilters.ActiveFilters table={table} />
          </div>
        </DataTableToolbar.Root>

        <div style={{ gridArea: "footer", marginTop: "1rem" }}>
          <DataTablePagination table={table} totalDbDataCount={totalDBRowCount} />
        </div>

        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="justify-center">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            <DeleteBulkUsers
              users={table.getSelectedRowModel().flatRows.map((row) => row.original)}
              onRemove={() => table.toggleAllPageRowsSelected(false)}
            />
          </DataTableSelectionBar.Root>
        )}
      </DataTable>
      {state.deleteMember.showModal && <DeleteMemberModal state={state} dispatch={dispatch} />}
    </>
  );
}
