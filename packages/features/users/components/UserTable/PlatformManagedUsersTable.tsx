"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useReducer, useState } from "react";

import {
  DataTableWrapper,
  DataTableProvider,
  DataTableToolbar,
  DataTableSelectionBar,
  DataTableFilters,
  DataTableSegment,
  useColumnFilters,
  useDataTable,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Checkbox } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";

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
    <DataTableProvider
      useSegments={useSegments}
      defaultPageSize={25}
      tableIdentifier={`platform-managed-users-${props.oAuthClientId}`}>
      <UserListTableContent {...props} />
    </DataTableProvider>
  );
}

function UserListTableContent({ oAuthClientId }: PlatformManagedUsersTableProps) {
  const { t } = useLocale();

  const [state, dispatch] = useReducer(reducer, initialState);
  const [rowSelection, setRowSelection] = useState({});

  const columnFilters = useColumnFilters();

  const { pageIndex, pageSize, searchTerm } = useDataTable();
  const limit = pageSize;
  const offset = pageIndex * pageSize;

  const { data, isPending } = trpc.viewer.organizations.listMembers.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: columnFilters,
      oAuthClientId,
    },
    {
      placeholderData: keepPreviousData,
      enabled: !!oAuthClientId,
    }
  );

  const totalRowCount = data?.meta?.totalRowCount ?? 0;

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.rows ?? [], [data]) as PlatformManagedUserTableUser[];

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
          return t("managed_users");
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
      },
      {
        id: "role",
        accessorFn: (data) => data.role,
        header: t("role"),
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
      },
      {
        id: "teams",
        accessorFn: (data) => data.teams.map((team) => team.name),
        header: t("teams"),
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

  const numberOfSelectedRows = useMemo(() => table.getSelectedRowModel().rows.length, [table]);

  return (
    <>
      <DataTableWrapper<PlatformManagedUserTableUser>
        testId="managed-user-list-data-table"
        table={table}
        isPending={isPending}
        totalRowCount={data?.meta?.totalRowCount}
        paginationMode="standard"
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar className="sm:max-w-64 max-w-full" />
            <DataTableFilters.ColumnVisibilityButton table={table} />
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ClearFiltersButton />
            <DataTableSegment.SaveButton />
            <DataTableSegment.Select />
          </>
        }>
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="bottom-16! justify-center md:w-max">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            <DeleteBulkUsers
              users={table.getSelectedRowModel().flatRows.map((row) => row.original)}
              onRemove={() => table.toggleAllPageRowsSelected(false)}
            />
          </DataTableSelectionBar.Root>
        )}
      </DataTableWrapper>
      {state.deleteMember.showModal && <DeleteMemberModal state={state} dispatch={dispatch} />}
    </>
  );
}
