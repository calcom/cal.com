"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { useMemo, useReducer, useRef, useState } from "react";

import {
  DataTable,
  DataTableToolbar,
  DataTableFilters,
  DataTableSelectionBar,
  DataTablePagination,
  useColumnFilters,
  useFetchMoreOnBottomReached,
  textFilter,
  isTextFilterValue,
} from "@calcom/features/data-table";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import {
  downloadAsCsv,
  generateCsvRawForMembersTable,
  generateHeaderFromReactTable,
} from "@calcom/lib/csvUtils";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Avatar, Badge, Checkbox, showToast } from "@calcom/ui";
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  const columnFilters = useColumnFilters();

  const { data, isPending, hasNextPage, fetchNextPage, isFetching } =
    trpc.viewer.organizations.listMembers.useInfiniteQuery(
      {
        limit: 30,
        searchTerm: debouncedSearchTerm,
        expand: ["attributes"],
        filters: columnFilters,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
      }
    );

  const exportQuery = trpc.viewer.organizations.listMembers.useInfiniteQuery(
    {
      limit: 100, // Max limit
      searchTerm: debouncedSearchTerm,
      expand: ["attributes"],
      filters: columnFilters,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: false,
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
          meta: {
            filterType: attribute.type.toLowerCase() === "text" ? "text" : "select",
          },
          size: 120,
          accessorFn: (data) => data.attributes.find((attr) => attr.attributeId === attribute.id)?.value,
          cell: ({ row }) => {
            const attributeValues = row.original.attributes.filter(
              (attr) => attr.attributeId === attribute.id
            );
            if (attributeValues.length === 0) return null;
            return (
              <div
                className={classNames(
                  attribute.type === "NUMBER" ? "flex w-full justify-center" : "flex flex-wrap"
                )}>
                {attributeValues.map((attributeValue, index) => {
                  const isAGroupOption = attributeValue.contains?.length > 0;
                  const suffix = attribute.isWeightsEnabled ? `${attributeValue.weight || 100}%` : undefined;
                  return (
                    <div className="mr-1 inline-flex shrink-0" key={attributeValue.id}>
                      <Badge
                        variant={isAGroupOption ? "orange" : "gray"}
                        className={classNames(suffix && "rounded-r-none")}>
                        {attributeValue.value}
                      </Badge>

                      {suffix ? (
                        <Badge
                          variant={isAGroupOption ? "orange" : "gray"}
                          style={{
                            backgroundColor: "color-mix(in hsl, var(--cal-bg-emphasis), black 5%)",
                          }}
                          className="rounded-l-none">
                          {suffix}
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          },
          filterFn: (row, id, filterValue) => {
            const attributeValues = row.original.attributes.filter((attr) => attr.attributeId === id);

            if (isTextFilterValue(filterValue)) {
              return attributeValues.some((attr) => textFilter(attr.value, filterValue));
            }

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
        enableResizing: false,
        size: 30,
        meta: {
          sticky: {
            position: "left",
          },
        },
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
          return `Members`;
        },
        meta: {
          sticky: { position: "left", gap: 24 },
        },
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
        size: 100,
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
        size: 140,
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
        id: "lastActiveAt",
        header: "Last Active",
        cell: ({ row }) => <div>{row.original.lastActiveAt}</div>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        size: 80,
        meta: {
          sticky: { position: "right" },
        },
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
    columnResizeMode: "onChange",
    debugTable: true,
    manualPagination: true,
    initialState: {
      columnVisibility: initalColumnVisibility,
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

  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  const handleDownload = async () => {
    try {
      if (!org?.slug || !org?.name) {
        throw new Error("Org slug or name is missing.");
      }
      setIsDownloading(true);
      const headers = generateHeaderFromReactTable(table);
      if (!headers || !headers.length) {
        throw new Error("Header is missing.");
      }

      const result = await exportQuery.refetch();
      if (!result.data) {
        throw new Error("There are no members found.");
      }
      const allMembers = result.data.pages.flatMap((page) => page.rows ?? []) ?? [];
      let lastPage = result.data.pages[result.data.pages.length - 1];

      while (lastPage.nextCursor) {
        const nextPage = await exportQuery.fetchNextPage();
        if (!nextPage.data) {
          break;
        }
        const latestPageItems = nextPage.data.pages[nextPage.data.pages.length - 1].rows ?? [];
        allMembers.push(...latestPageItems);
        lastPage = nextPage.data.pages[nextPage.data.pages.length - 1];
      }

      const ATTRIBUTE_IDS = attributes?.map((attr) => attr.id) ?? [];
      const csvRaw = generateCsvRawForMembersTable(
        headers,
        allMembers as UserTableUser[],
        ATTRIBUTE_IDS,
        domain
      );
      if (!csvRaw) {
        throw new Error("Generating CSV file failed.");
      }

      const filename = `${org.name}_${new Date().toISOString().split("T")[0]}.csv`;
      downloadAsCsv(csvRaw, filename);
    } catch (error) {
      showToast(`Error: ${error}`, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <DataTable
        data-testid="user-list-data-table"
        // className="lg:max-w-screen-lg"
        table={table}
        tableContainerRef={tableContainerRef}
        isPending={isPending}
        enableColumnResizing={{ name: "UserListTable" }}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
        <DataTableToolbar.Root className="lg:max-w-screen-2xl">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
              <DataTableToolbar.SearchBar
                table={table}
                onSearch={(value) => setDebouncedSearchTerm(value)}
                className="sm:max-w-64 max-w-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DataTableToolbar.CTA
                type="button"
                color="secondary"
                StartIcon="file-down"
                loading={isDownloading}
                onClick={() => handleDownload()}
                data-testid="export-members-button">
                {t("download")}
              </DataTableToolbar.CTA>
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
          </div>
          <div className="flex gap-2 justify-self-start">
            <DataTableFilters.ActiveFilters table={table} />
          </div>
        </DataTableToolbar.Root>

        <div style={{ gridArea: "footer", marginTop: "1rem" }}>
          <DataTablePagination table={table} totalDbDataCount={totalDBRowCount} />
        </div>

        {numberOfSelectedRows >= 2 && dynamicLinkVisible && (
          <DataTableSelectionBar.Root className="!bottom-16 md:!bottom-20">
            <DynamicLink table={table} domain={domain} />
          </DataTableSelectionBar.Root>
        )}
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="justify-center">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            {!isPlatformUser ? (
              <>
                <TeamListBulkAction table={table} />
                {numberOfSelectedRows >= 2 && (
                  <DataTableSelectionBar.Button
                    onClick={() => setDynamicLinkVisible(!dynamicLinkVisible)}
                    icon="handshake">
                    {t("group_meeting")}
                  </DataTableSelectionBar.Button>
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
