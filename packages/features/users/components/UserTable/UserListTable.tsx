"use client";

import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnFiltersState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { ColumnMeta } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { useMemo, useReducer, useRef, useState } from "react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  DataTable,
  DataTableToolbar,
  DataTableFilters,
  DataTableSelectionBar,
  DataTablePagination,
} from "@calcom/ui";
import { useFetchMoreOnBottomReached } from "@calcom/ui/data-table";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";

import { DeleteBulkUsers } from "./BulkActions/DeleteBulkUsers";
import { DynamicLink } from "./BulkActions/DynamicLink";
import { EventTypesList } from "./BulkActions/EventTypesList";
import { MassAssignAttributesBulkAction } from "./BulkActions/MassAssignAttributes";
import { TeamListBulkAction } from "./BulkActions/TeamList";
import { ChangeUserRoleModal } from "./ChangeUserRoleModal";
import { DeleteMemberModal } from "./DeleteMemberModal";
import { EditUserSheet } from "./EditSheet/EditUserSheet";
import { ImpersonationMemberModal } from "./ImpersonationMemberModal";
import { InviteMemberModal } from "./InviteMemberModal";
import { TableActions } from "./UserTableActions";
import type { UserTableState, UserTableAction, UserTableUser } from "./types";

type CustomColumnMeta<TData, TValue> = ColumnMeta<TData, TValue> & {
  sticky?: boolean;
  stickLeft?: number;
};

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

export function UserListTable() {
  const [dynamicLinkVisible, setDynamicLinkVisible] = useQueryState("dynamicLink", parseAsBoolean);
  const orgBranding = useOrgBranding();
  const domain = orgBranding?.fullDomain ?? WEBAPP_URL;
  const { t } = useLocale();

  const { data: session } = useSession();
  const { isPlatformUser } = useGetUserAttributes();
  const { data: org } = trpc.viewer.organizations.listCurrent.useQuery();
  const { data: attributes } = trpc.viewer.attributes.list.useQuery();
  const { data: teams } = trpc.viewer.organizations.getTeams.useQuery();
  const { data: facetedTeamValues } = trpc.viewer.organizations.getFacetedValues.useQuery();

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data, isPending, fetchNextPage, isFetching } =
    trpc.viewer.organizations.listMembers.useInfiniteQuery(
      {
        limit: 10,
        searchTerm: debouncedSearchTerm,
        expand: ["attributes"],
        filters: columnFilters.map((filter) => ({
          id: filter.id,
          value: filter.value as string[],
        })),
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
      }
    );

  // TODO (SEAN): Make Column filters a trpc query param so we can fetch serverside even if the data is not loaded
  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const adminOrOwner = org?.user.role === "ADMIN" || org?.user.role === "OWNER";

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]) as UserTableUser[];
  const totalFetched = flatData.length;

  const memorisedColumns = useMemo(() => {
    const permissions = {
      canEdit: adminOrOwner,
      canRemove: adminOrOwner,
      canResendInvitation: adminOrOwner,
      canImpersonate: false,
    };
    const generateAttributeColumns = () => {
      if (!attributes?.length) {
        return [];
      }
      return (
        (attributes?.map((attribute) => ({
          id: attribute.id,
          header: attribute.name,
          accessorFn: (data) => data.attributes.find((attr) => attr.attributeId === attribute.id)?.value,
          cell: ({ row }) => {
            const attributeValues = row.original.attributes.filter(
              (attr) => attr.attributeId === attribute.id
            );
            if (attributeValues.length === 0) return null;
            return (
              <>
                {attributeValues.map((attributeValue, index) => (
                  <Badge key={index} variant="gray" className="mr-1">
                    {attributeValue.value}
                  </Badge>
                ))}
              </>
            );
          },
          filterFn: (rows, id, filterValue) => {
            const attributeValues = rows.original.attributes.filter((attr) => attr.attributeId === id);
            if (attributeValues.length === 0) return false;
            return attributeValues.some((attr) => filterValue.includes(attr.value));
          },
        })) as ColumnDef<UserTableUser>[]) ?? []
      );
    };
    const cols: ColumnDef<UserTableUser>[] = [
      // Disabling select for this PR: Will work on actions etc in a follow up
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        meta: {
          sticky: true,
          stickLeft: 0,
        } as CustomColumnMeta<UserTableUser, unknown>,
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
        header: () => {
          return `Members`;
        },
        meta: {
          sticky: true,
          stickyLeft: 24,
        } as CustomColumnMeta<UserTableUser, unknown>,
        cell: ({ row }) => {
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
        cell: ({ row, table }) => {
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
        cell: ({ row, table }) => {
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
      ...generateAttributeColumns(),
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original;
          const permissionsRaw = permissions;
          const isSelf = user.id === session?.user.id;

          const permissionsForUser = {
            canEdit: permissionsRaw.canEdit && user.accepted && !isSelf,
            canRemove: permissionsRaw.canRemove && !isSelf,
            canImpersonate:
              user.accepted && !user.disableImpersonation && !isSelf && !!org?.canAdminImpersonate,
            canLeave: user.accepted && isSelf,
            canResendInvitation: permissionsRaw.canResendInvitation && !user.accepted,
          };

          return (
            <TableActions
              user={user}
              permissionsForUser={permissionsForUser}
              dispatch={dispatch}
              domain={domain}
            />
          );
        },
      },
    ];

    return cols;
  }, [session?.user.id, adminOrOwner, dispatch, domain, totalDBRowCount, attributes]);

  const table = useReactTable({
    data: flatData,
    columns: memorisedColumns,
    enableRowSelection: true,
    debugTable: true,
    manualPagination: true,
    initialState: {
      columnVisibility: initalColumnVisibility,
    },
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    // TODO(SEAN): We need to move filter state to the server so we can fetch more data when the filters change if theyre not in client cache
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: (_, columnId) => () => {
      if (facetedTeamValues) {
        switch (columnId) {
          case "role":
            return new Map(facetedTeamValues.roles.map((role) => [role, 1]));
          case "teams":
            return new Map(facetedTeamValues.teams.map((team) => [team.name, 1]));
          default:
            const attribute = facetedTeamValues.attributes.find((attr) => attr.id === columnId);
            if (attribute) {
              return new Map(attribute?.options.map(({ value }) => [value, 1]) ?? []);
            }
            return new Map();
        }
      }
      return new Map();
    },
  });

  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached(
    tableContainerRef,
    fetchNextPage,
    isFetching,
    totalFetched,
    totalDBRowCount
  );

  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  return (
    <>
      <DataTable
        data-testid="user-list-data-table"
        // className="lg:max-w-screen-lg"
        table={table}
        tableContainerRef={tableContainerRef}
        isPending={isPending}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
        <DataTableToolbar.Root className="lg:max-w-screen-2xl">
          <div className="flex w-full gap-2">
            <DataTableToolbar.SearchBar table={table} onSearch={(value) => setDebouncedSearchTerm(value)} />
            {/* We have to omit member because we don't want the filter to show but we can't disable filtering as we need that for the search bar */}
            <DataTableFilters.FilterButton table={table} omit={["member"]} />
            <DataTableFilters.ColumnVisibilityButton table={table} />
            {adminOrOwner && (
              <DataTableToolbar.CTA
                type="button"
                color="primary"
                StartIcon="plus"
                className="rounded-md"
                onClick={() =>
                  dispatch({
                    type: "INVITE_MEMBER",
                    payload: {
                      showModal: true,
                    },
                  })
                }
                data-testid="new-organization-member-button">
                {t("add")}
              </DataTableToolbar.CTA>
            )}
          </div>
          <div className="flex gap-2 justify-self-start">
            <DataTableFilters.ActiveFilters table={table} />
          </div>
        </DataTableToolbar.Root>
        <div style={{ gridArea: "footer", marginTop: "1rem" }}>
          <DataTablePagination table={table} totalDbDataCount={totalDBRowCount} />
        </div>

        {numberOfSelectedRows >= 2 && dynamicLinkVisible && (
          <DataTableSelectionBar.Root style={{ bottom: "5rem" }}>
            <DynamicLink table={table} domain={domain} />
          </DataTableSelectionBar.Root>
        )}
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root>
            <p className="text-brand-subtle w-full px-2 text-center leading-none">
              {numberOfSelectedRows} selected
            </p>
            {!isPlatformUser ? (
              <>
                <TeamListBulkAction table={table} />
                {numberOfSelectedRows >= 2 && (
                  <Button onClick={() => setDynamicLinkVisible(!dynamicLinkVisible)} StartIcon="handshake">
                    Group Meeting
                  </Button>
                )}
                <MassAssignAttributesBulkAction table={table} filters={columnFilters} />
                <EventTypesList table={table} orgTeams={teams} />
              </>
            ) : null}
            <DeleteBulkUsers
              users={table.getSelectedRowModel().flatRows.map((row) => row.original)}
              onRemove={() => table.toggleAllPageRowsSelected(false)}
            />
          </DataTableSelectionBar.Root>
        )}
      </DataTable>

      {state.deleteMember.showModal && <DeleteMemberModal state={state} dispatch={dispatch} />}
      {state.inviteMember.showModal && <InviteMemberModal dispatch={dispatch} />}
      {state.impersonateMember.showModal && <ImpersonationMemberModal dispatch={dispatch} state={state} />}
      {state.changeMemberRole.showModal && <ChangeUserRoleModal dispatch={dispatch} state={state} />}
      {state.editSheet.showModal && <EditUserSheet dispatch={dispatch} state={state} />}
    </>
  );
}
