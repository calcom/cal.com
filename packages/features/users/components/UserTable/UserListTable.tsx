"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { useMemo, useReducer, useState } from "react";

import {
  DataTableWrapper,
  DataTableProvider,
  DataTableToolbar,
  DataTableSelectionBar,
  DataTableFilters,
  useColumnFilters,
  ColumnFilterType,
  convertFacetedValuesToMap,
  useDataTable,
} from "@calcom/features/data-table";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import {
  downloadAsCsv,
  generateCsvRawForMembersTable,
  generateHeaderFromReactTable,
} from "@calcom/lib/csvUtils";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Checkbox } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
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
  return (
    <DataTableProvider defaultPageSize={25}>
      <UserListTableContent />
    </DataTableProvider>
  );
}

function UserListTableContent() {
  const [dynamicLinkVisible, setDynamicLinkVisible] = useQueryState("dynamicLink", parseAsBoolean);
  const orgBranding = useOrgBranding();
  const domain = orgBranding?.fullDomain ?? WEBAPP_URL;
  const { t } = useLocale();

  const { data: session } = useSession();
  const { isPlatformUser } = useGetUserAttributes();
  const { data: org } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: attributes, isSuccess: isSuccessAttributes } = trpc.viewer.attributes.list.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );
  const { data: teams } = trpc.viewer.organizations.getTeams.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: facetedTeamValues } = trpc.viewer.organizations.getFacetedValues.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [state, dispatch] = useReducer(reducer, initialState);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  const columnFilters = useColumnFilters();

  const { limit, offset } = useDataTable();

  const { data, isPending } = trpc.viewer.organizations.listMembers.useQuery(
    {
      limit,
      offset,
      searchTerm: debouncedSearchTerm,
      expand: ["attributes"],
      filters: columnFilters,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  // TODO (SEAN): Make Column filters a trpc query param so we can fetch serverside even if the data is not loaded
  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const adminOrOwner = org?.user.role === "ADMIN" || org?.user.role === "OWNER";

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo<UserTableUser[]>(() => data?.rows ?? [], [data]);

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
      const attributeColumns: ColumnDef<UserTableUser>[] =
        attributes?.map((attribute) => {
          // TODO: We need to normalize AttributeOption table first
          // so that we can have `number_value` column for numeric operations.
          // Currently, `value` column is used for both text and number attributes.
          //
          // const isNumber = attribute.type === "NUMBER";
          const isNumber = false;
          const isText = attribute.type === "TEXT";
          const isSingleSelect = attribute.type === "SINGLE_SELECT";
          // const isMultiSelect = attribute.type === "MULTI_SELECT";
          const filterType = isNumber
            ? ColumnFilterType.NUMBER
            : isText
            ? ColumnFilterType.TEXT
            : isSingleSelect
            ? ColumnFilterType.SINGLE_SELECT
            : ColumnFilterType.MULTI_SELECT;

          return {
            id: attribute.id,
            header: attribute.name,
            meta: {
              filter: { type: filterType },
            },
            size: 120,
            accessorFn: (data) => data.attributes?.find((attr) => attr.attributeId === attribute.id)?.value,
            cell: ({ row }) => {
              const attributeValues = row.original.attributes?.filter(
                (attr) => attr.attributeId === attribute.id
              );
              if (attributeValues?.length === 0) return null;
              return (
                <div className={classNames(isNumber ? "flex w-full justify-center" : "flex flex-wrap")}>
                  {attributeValues?.map((attributeValue) => {
                    const isAGroupOption = attributeValue.contains?.length > 0;
                    const suffix = attribute.isWeightsEnabled
                      ? `${attributeValue.weight || 100}%`
                      : undefined;
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
          };
        }) ?? [];
      return attributeColumns;
    };

    const cols: ColumnDef<UserTableUser>[] = [
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
        enableColumnFilter: false,
        size: 200,
        header: "Members",
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
  }, [session?.user.id, adminOrOwner, dispatch, domain, attributes, org?.canAdminImpersonate]);

  const table = useReactTable({
    data: flatData,
    columns: memorisedColumns,
    enableRowSelection: true,
    manualPagination: true,
    state: {
      rowSelection,
    },
    initialState: {
      columnVisibility: initalColumnVisibility,
      columnPinning: {
        left: ["select", "member"],
        right: ["actions"],
      },
    },
    defaultColumn: {
      size: 150,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => `${row.id}`,
    getFacetedUniqueValues: (_, columnId) => () => {
      if (facetedTeamValues) {
        switch (columnId) {
          case "role":
            return convertFacetedValuesToMap(
              facetedTeamValues.roles.map((role) => ({
                label: role,
                value: role,
              }))
            );
          case "teams":
            return convertFacetedValuesToMap(
              facetedTeamValues.teams.map((team) => ({
                label: team.name,
                value: team.name,
              }))
            );
          default:
            const attribute = facetedTeamValues.attributes.find((attr) => attr.id === columnId);
            if (attribute) {
              return convertFacetedValuesToMap(
                attribute?.options.map(({ value }) => ({
                  label: value,
                  value,
                })) ?? []
              );
            }
            return new Map();
        }
      }
      return new Map();
    },
  });

  const utils = trpc.useUtils();

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

      // Fetch all pages
      let allRows: UserTableUser[] = [];
      let offset: number | undefined = 0;
      const limit = 100;

      while (offset !== undefined) {
        const result = await utils.viewer.organizations.listMembers.fetch({
          limit,
          offset,
          searchTerm: debouncedSearchTerm,
          expand: ["attributes"],
          filters: columnFilters,
        });

        if (!result.rows?.length) {
          offset = undefined;
          continue;
        }

        allRows = [...allRows, ...result.rows];
        offset = offset + limit;
      }

      if (!allRows.length) {
        throw new Error("There are no members found.");
      }

      const ATTRIBUTE_IDS = attributes?.map((attr) => attr.id) ?? [];
      const csvRaw = generateCsvRawForMembersTable(headers, allRows, ATTRIBUTE_IDS, domain);
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

  if (!isPlatformUser && !isSuccessAttributes) {
    // do not render the table until the attributes are fetched
    return null;
  }

  return (
    <>
      <DataTableWrapper<UserTableUser>
        testId="user-list-data-table"
        table={table}
        isPending={isPending}
        totalRowCount={data?.meta?.totalRowCount}
        paginationMode="standard"
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar table={table} onSearch={(value) => setDebouncedSearchTerm(value)} />
            <DataTableFilters.AddFilterButton table={table} hideWhenFilterApplied />
            <DataTableFilters.ActiveFilters table={table} />
            <DataTableFilters.AddFilterButton table={table} variant="sm" showWhenFilterApplied />
            <DataTableFilters.ClearFiltersButton />
          </>
        }
        ToolbarRight={
          <>
            <DataTableToolbar.CTA
              type="button"
              color="secondary"
              StartIcon="file-down"
              loading={isDownloading}
              onClick={() => handleDownload()}
              data-testid="export-members-button">
              {t("download")}
            </DataTableToolbar.CTA>
            <DataTableFilters.ColumnVisibilityButton table={table} />
            {adminOrOwner && (
              <DataTableToolbar.CTA
                type="button"
                color="primary"
                StartIcon="plus"
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
          </>
        }>
        {numberOfSelectedRows >= 2 && dynamicLinkVisible && (
          <DataTableSelectionBar.Root className="!bottom-16 md:!bottom-20">
            <DynamicLink table={table} domain={domain} />
          </DataTableSelectionBar.Root>
        )}
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root
            className="justify-center"
            style={{
              width: "max-content",
            }}>
            <p className="text-brand-subtle shrink-0 px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            {!isPlatformUser ? (
              <>
                <TeamListBulkAction table={table} />
                {numberOfSelectedRows >= 2 && (
                  <DataTableSelectionBar.Button
                    color="secondary"
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
      </DataTableWrapper>

      {state.deleteMember.showModal && <DeleteMemberModal state={state} dispatch={dispatch} />}
      {state.inviteMember.showModal && <InviteMemberModal dispatch={dispatch} />}
      {state.impersonateMember.showModal && <ImpersonationMemberModal dispatch={dispatch} state={state} />}
      {state.changeMemberRole.showModal && <ChangeUserRoleModal dispatch={dispatch} state={state} />}
      {state.editSheet.showModal && <EditUserSheet dispatch={dispatch} state={state} />}
    </>
  );
}
