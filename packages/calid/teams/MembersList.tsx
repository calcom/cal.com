"use client";

import { Avatar, Button, Badge, DialogContent, DialogFooter, DialogClose } from "@calid/features/ui";
import { keepPreviousData } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import classNames from "classnames";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useQueryState, parseAsBoolean } from "nuqs";
import React from "react";
import { useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import {
  DataTableProvider,
  DataTableToolbar,
  DataTableFilters,
  DataTableWrapper,
  DataTableSelectionBar,
  useDataTable,
  useFetchMoreOnBottomReached,
  useColumnFilters,
  convertFacetedValuesToMap,
} from "@calcom/features/data-table";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { DynamicLink } from "@calcom/features/users/components/UserTable/BulkActions/DynamicLink";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
// import { Avatar } from "@calcom/ui/components/avatar";
// import { Badge } from "@calcom/ui/components/badge";
// import { Button } from "@calcom/ui/components/button";
// import {
//   DialogContent,
//   DialogFooter,
//   DialogClose,
//   ConfirmationDialogContent,
// } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Checkbox } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import DeleteBulkTeamMembers from "./DeleteBulkTeamMembers";
import { EditMemberSheet } from "./EditMemberSheet";
import { EventTypesList } from "./EventTypesList";
import TeamAvailabilityModal from "./TeamAvailabilityModal";

interface ComponentProps {
  team: NonNullable<RouterOutputs["viewer"]["teams"]["get"]>;
  isOrgAdminOrOwner: boolean | undefined;
  setShowMemberInvitationModal: Dispatch<SetStateAction<boolean>>;
}

export type TeamMember = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

const validateOrganizationStructure = (groupData: ComponentProps["team"]) => {
  return groupData.isOrganization;
};

type ModalState = {
  showModal: boolean;
  user?: TeamMember;
};

export type ComponentState = {
  deleteMember: ModalState;
  impersonateMember: ModalState;
  editSheet: ModalState;
  teamAvailability: ModalState;
};

export type ComponentAction =
  | {
      type:
        | "SET_DELETE_ID"
        | "SET_IMPERSONATE_ID"
        | "EDIT_USER_SHEET"
        | "TEAM_AVAILABILITY"
        | "INVITE_MEMBER";
      payload: ModalState;
    }
  | {
      type: "CLOSE_MODAL";
    };

const defaultComponentState: ComponentState = {
  deleteMember: {
    showModal: false,
  },
  impersonateMember: {
    showModal: false,
  },
  editSheet: {
    showModal: false,
  },
  teamAvailability: {
    showModal: false,
  },
};

const defaultVisibilitySettings = {
  select: true,
  member: true,
  role: true,
  teams: true,
  actions: true,
};

function stateReducer(currentState: ComponentState, action: ComponentAction): ComponentState {
  switch (action.type) {
    case "SET_DELETE_ID":
      return { ...currentState, deleteMember: action.payload };
    case "SET_IMPERSONATE_ID":
      return { ...currentState, impersonateMember: action.payload };
    case "EDIT_USER_SHEET":
      return { ...currentState, editSheet: action.payload };
    case "TEAM_AVAILABILITY":
      return { ...currentState, teamAvailability: action.payload };
    case "CLOSE_MODAL":
      return {
        ...currentState,
        deleteMember: { showModal: false },
        impersonateMember: { showModal: false },
        editSheet: { showModal: false },
        teamAvailability: { showModal: false },
      };
    default:
      return currentState;
  }
}

interface ExtendedComponentProps {
  team: NonNullable<RouterOutputs["viewer"]["teams"]["get"]>;
  isOrgAdminOrOwner: boolean | undefined;
  setShowMemberInvitationModal: Dispatch<SetStateAction<boolean>>;
  facetedTeamValues?: {
    roles: { id: string; name: string }[];
    teams: RouterOutputs["viewer"]["teams"]["get"][];
    attributes: {
      id: string;
      name: string;
      options: {
        value: string;
      }[];
    }[];
  };
}

export default function MemberList(componentProps: ExtendedComponentProps) {
  return (
    <DataTableProvider>
      <InternalMemberListComponent {...componentProps} />
    </DataTableProvider>
  );
}

function InternalMemberListComponent(componentProps: ExtendedComponentProps) {
  const { facetedTeamValues } = componentProps;
  const [linkVisibilityState, setLinkVisibilityState] = useQueryState("dynamicLink", parseAsBoolean);
  const { t, i18n } = useLocale();
  const { data: sessionData } = useSession();

  const trpcUtils = trpc.useUtils();
  const organizationBranding = useOrgBranding();
  const applicationDomain = organizationBranding?.fullDomain ?? WEBAPP_URL;

  const containerReference = useRef<HTMLDivElement>(null);
  const [componentState, stateDispatcher] = useReducer(stateReducer, defaultComponentState);

  const { searchTerm } = useDataTable();

  const { data, isPending, hasNextPage, fetchNextPage, isFetching } =
    trpc.viewer.teams.listMembers.useInfiniteQuery(
      {
        limit: 10,
        searchTerm,
        teamId: componentProps.team.id,
      },
      {
        enabled: !!componentProps.team.id,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      }
    );

  const filterConfiguration = useColumnFilters();
  const [selectionState, setSelectionState] = useState({});

  const updateCacheAfterRemoval = ({
    utils,
    memberId,
    teamId,
    searchTerm,
  }: {
    utils: ReturnType<typeof trpc.useUtils>;
    memberId: number;
    teamId: number;
    searchTerm: string;
  }) => {
    utils.viewer.teams.listMembers.setInfiniteData(
      {
        limit: 10,
        teamId,
        searchTerm,
      },
      (existingData) => {
        if (!existingData) {
          return {
            pages: [],
            pageParams: [],
          };
        }

        return {
          ...existingData,
          pages: existingData.pages.map((page) => ({
            ...page,
            members: page.members.filter((member) => member.id !== memberId),
          })),
        };
      }
    );
  };

  const memberRemovalMutation = trpc.viewer.teams.removeMember.useMutation({
    onMutate: async ({ teamIds }) => {
      await trpcUtils.viewer.teams.listMembers.cancel();
      const cachedData = trpcUtils.viewer.teams.listMembers.getInfiniteData({
        limit: 10,
        teamId: teamIds[0],
        searchTerm,
      });

      if (cachedData) {
        updateCacheAfterRemoval({
          utils: trpcUtils,
          memberId: componentState.deleteMember.user?.id as number,
          teamId: teamIds[0],
          searchTerm,
        });
      }
      return { previousValue: cachedData };
    },
    async onSuccess() {
      await trpcUtils.viewer.teams.get.invalidate();
      await trpcUtils.viewer.eventTypes.invalidate();
      await trpcUtils.viewer.organizations.listMembers.invalidate();
      await trpcUtils.viewer.organizations.getMembers.invalidate();
      showToast(t("success"), "success");
    },
    async onError(error) {
      showToast(error.message, "error");
    },
  });

  const inviteResendMutation = trpc.viewer.teams.resendInvitation.useMutation({
    onSuccess: () => {
      showToast(t("invitation_resent"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const hasAdminPrivileges = checkAdminOrOwner(componentProps.team.membership.role);

  const executeRemoval = () =>
    memberRemovalMutation.mutate({
      teamIds: [componentProps.team?.id],
      memberIds: [componentState.deleteMember.user?.id as number],
      isOrg: validateOrganizationStructure(componentProps.team),
    });

  const totalRecordCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;

  const columnDefinitions = useMemo(() => {
    const tableColumns: ColumnDef<TeamMember>[] = [
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
        accessorFn: (record) => record.email,
        enableHiding: false,
        header: "Member",
        size: 250,
        cell: ({ row }) => {
          const { username, email, avatarUrl, accepted, name } = row.original;
          const displayName =
            name ||
            (() => {
              const emailPrefix = email.split("@")[0];
              return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            })();
          return (
            <div className="flex items-center gap-2">
              <Avatar
                size="sm"
                alt={username || email}
                imageSrc={getUserAvatarUrl({
                  avatarUrl,
                })}
              />
              <div data-testid={`member-${username}`}>
                <div data-testid="member-name" className="text-emphasis text-sm font-medium leading-none">
                  {displayName}
                </div>
                <div
                  data-testid={accepted ? "member-email" : `email-${email.replace("@", "")}-pending`}
                  className="text-subtle mt-1 text-sm leading-none">
                  {email}
                </div>
              </div>
            </div>
          );
        },
        filterFn: (rowData, id, filterValue) => {
          const { data } = filterValue;
          const memberEmail = rowData.original.email;
          return data.includes(memberEmail);
        },
      },
      {
        id: "role",
        accessorFn: (record) => record.role,
        header: "Role",
        size: 100,
        cell: ({ row, table }) => {
          const { role, accepted, customRole } = row.original;
          const displayRole = customRole?.name || role;
          const roleId = customRole?.id || role;
          return (
            <div className="flex h-full flex-wrap items-center gap-2">
              {!accepted && (
                <Badge
                  data-testid="member-pending"
                  variant="orange"
                  className="text-xs"
                  onClick={() => {
                    table.getColumn("role")?.setFilterValue(["PENDING"]);
                  }}>
                  Pending
                </Badge>
              )}
              <Badge
                data-testid="member-role"
                variant={role === "MEMBER" ? "gray" : "blue"}
                onClick={() => {
                  table.getColumn("role")?.setFilterValue([roleId]);
                }}>
                {displayRole}
              </Badge>
            </div>
          );
        },
        filterFn: (rowData, id, filterValue) => {
          const { data } = filterValue;
          const { role, accepted, customRole } = rowData.original;
          const roleIdentifier = customRole?.id || role;

          if (data.includes("PENDING")) {
            if (data.length === 1) return !accepted;
            else return !accepted || data.includes(roleIdentifier);
          }

          return data.includes(roleIdentifier);
        },
      },
      {
        id: "lastActiveAt",
        header: "Last Active",
        cell: ({ row }) => {
          const value = row.original.lastActiveAt as unknown as string | null | undefined;
          let display: string = "—";
          if (value) {
            const date = new Date(value);
            display = Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
          }
          return <div className="text-default text-sm">{display}</div>;
        },
      },
      {
        id: "actions",
        size: 90,
        enableResizing: false,
        cell: ({ row }) => {
          const memberData = row.original;
          const isCurrentUser = memberData.id === sessionData?.user.id;
          const canEdit =
            (componentProps.team.membership?.role === MembershipRole.OWNER &&
              (memberData.role !== MembershipRole.OWNER || !isCurrentUser)) ||
            (componentProps.team.membership?.role === MembershipRole.ADMIN &&
              memberData.role !== MembershipRole.OWNER) ||
            componentProps.isOrgAdminOrOwner;
          const canImpersonate =
            canEdit &&
            !memberData.disableImpersonation &&
            memberData.accepted &&
            process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "true";
          const canResend = canEdit && !memberData.accepted;
          return (
            <>
              {componentProps.team.membership?.accepted && (
                <div className="flex items-center justify-end">
                  {!!memberData.accepted && (
                    <Tooltip content={t("view_public_page")}>
                      <Button
                        target="_blank"
                        href={`${memberData.bookerUrl}/${memberData.username}`}
                        color="minimal"
                        variant="icon"
                        StartIcon="external-link"
                        disabled={!memberData.accepted}
                      />
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button color="minimal" variant="icon" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              onClick={() =>
                                stateDispatcher({
                                  type: "EDIT_USER_SHEET",
                                  payload: {
                                    user: memberData,
                                    showModal: true,
                                  },
                                })
                              }
                              StartIcon="pencil">
                              {t("edit")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          {canImpersonate && (
                            <>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  onClick={() =>
                                    stateDispatcher({
                                      type: "SET_IMPERSONATE_ID",
                                      payload: {
                                        user: memberData,
                                        showModal: true,
                                      },
                                    })
                                  }
                                  StartIcon="lock">
                                  {t("impersonate")}
                                </DropdownItem>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canResend && (
                            <DropdownMenuItem>
                              <DropdownItem
                                type="button"
                                onClick={() => {
                                  inviteResendMutation.mutate({
                                    teamId: componentProps.team?.id,
                                    email: memberData.email,
                                    language: i18n.language,
                                  });
                                }}
                                StartIcon="send">
                                {t("resend_invitation")}
                              </DropdownItem>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              onClick={() =>
                                stateDispatcher({
                                  type: "SET_DELETE_ID",
                                  payload: {
                                    user: memberData,
                                    showModal: true,
                                  },
                                })
                              }
                              color="destructive"
                              StartIcon="user-x">
                              {t("remove")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </Dropdown>
                  )}
                  <div className="flex md:hidden">
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent>
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              disabled={!memberData.accepted}
                              href={!memberData.accepted ? undefined : `/${memberData.username}`}
                              target="_blank"
                              type="button"
                              StartIcon="external-link">
                              {t("view_public_page")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  onClick={() =>
                                    stateDispatcher({
                                      type: "EDIT_USER_SHEET",
                                      payload: {
                                        user: memberData,
                                        showModal: true,
                                      },
                                    })
                                  }
                                  StartIcon="pencil">
                                  {t("edit")}
                                </DropdownItem>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  color="destructive"
                                  onClick={() =>
                                    stateDispatcher({
                                      type: "SET_DELETE_ID",
                                      payload: {
                                        user: memberData,
                                        showModal: true,
                                      },
                                    })
                                  }
                                  StartIcon="user-x">
                                  {t("remove")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </Dropdown>
                  </div>
                </div>
              )}
            </>
          );
        },
      },
    ];

    return tableColumns;
  }, [componentProps.isOrgAdminOrOwner, stateDispatcher, totalRecordCount, sessionData?.user.id]);

  const flattenedData = useMemo(
    () => data?.pages?.flatMap((page) => page.members) ?? [],
    [data]
  ) as TeamMember[];

  const dataTable = useReactTable({
    data: flattenedData,
    columns: columnDefinitions,
    enableRowSelection: true,
    debugTable: true,
    manualPagination: true,
    initialState: {
      columnVisibility: defaultVisibilitySettings,
      columnPinning: {
        right: ["actions"],
      },
    },
    state: {
      columnFilters: filterConfiguration,
      rowSelection: selectionState,
    },
    onRowSelectionChange: setSelectionState,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: (_, columnId) => () => {
      if (facetedTeamValues) {
        switch (columnId) {
          case "role":
            const roleOptions = facetedTeamValues.roles.map((role) => ({
              label: role.name,
              value: role.id,
            }));

            return convertFacetedValuesToMap(roleOptions);
          default:
            return new Map();
        }
      }
      return new Map();
    },
    getRowId: (row) => `${row.id}`,
  });

  const infiniteScrollHandler = useFetchMoreOnBottomReached({
    tableContainerRef: containerReference,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  const selectedRowsCount = dataTable.getSelectedRowModel().rows.length;

  return (
    <>
      <DataTableWrapper
        testId="team-member-list-container"
        table={dataTable}
        tableContainerRef={containerReference}
        isPending={isPending}
        enableColumnResizing={true}
        showHeader={true}
        containerClassName="border border-subtle rounded-md"
        headerClassName="bg-default border-b border-subtle"
        rowClassName="border-b border-subtle last:border-0"
        paginationMode="infinite"
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetching={isFetching}
        totalRowCount={totalRecordCount}
        ToolbarLeft={
          <div className="flex flex-row items-center gap-2">
            <DataTableToolbar.SearchBar className="h-[48px]" />
            <DataTableFilters.ColumnVisibilityButton table={dataTable} />

            {selectedRowsCount > 0 && (
              <div className="flex flex-row items-center gap-2">
                {/* <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
                  {t("number_selected", { count: selectedRowsCount })}
                </p> */}
                {selectedRowsCount >= 2 && (
                  <DataTableSelectionBar.Button
                    color="secondary"
                    onClick={() => setLinkVisibilityState(!linkVisibilityState)}
                    icon="handshake">
                    {t("group_meeting")}
                  </DataTableSelectionBar.Button>
                )}
                <EventTypesList table={dataTable} teamId={componentProps.team.id} />
                <DeleteBulkTeamMembers
                  users={dataTable.getSelectedRowModel().flatRows.map((row) => row.original)}
                  onRemove={() => dataTable.toggleAllPageRowsSelected(false)}
                  isOrg={validateOrganizationStructure(componentProps.team)}
                  teamId={componentProps.team.id}
                />
              </div>
            )}

            <DataTableFilters.FilterBar table={dataTable} />
          </div>
        }
        ToolbarRight={
          <>
            {selectedRowsCount >= 2 && linkVisibilityState && (
              <DynamicLink onlyButton table={dataTable} domain={applicationDomain} />
            )}
            <DataTableFilters.ClearFiltersButton />
            {hasAdminPrivileges && (
              <DataTableToolbar.CTA
                type="button"
                color="primary"
                StartIcon="plus"
                onClick={() => componentProps.setShowMemberInvitationModal(true)}
                data-testid="new-member-button">
                {t("add")}
              </DataTableToolbar.CTA>
            )}
          </>
        }></DataTableWrapper>
      {componentState.deleteMember.showModal && (
        <Dialog
          open={true}
          onOpenChange={(isOpen) =>
            !isOpen &&
            stateDispatcher({
              type: "CLOSE_MODAL",
            })
          }>
          <DialogContent title={t("remove_member")} description={t("remove_member_confirmation_message")}>
            <div className="flex flex-col gap-2">
              <p className="text-default text-sm">{t("remove_member_confirmation_message")}</p>
              <Button color="destructive" onClick={executeRemoval}>
                {t("confirm_remove_member")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {componentState.impersonateMember.showModal && componentState.impersonateMember.user?.username && (
        <Dialog
          open={true}
          onOpenChange={() =>
            stateDispatcher({
              type: "CLOSE_MODAL",
            })
          }>
          <DialogContent type="creation" title={t("impersonate")} description={t("impersonation_user_tip")}>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await signIn("impersonation-auth", {
                  username: componentState.impersonateMember.user?.email,
                  teamId: componentProps.team.id,
                });
                stateDispatcher({
                  type: "CLOSE_MODAL",
                });
              }}>
              <DialogFooter className="mt-8">
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => {
                    stateDispatcher({
                      type: "CLOSE_MODAL",
                    });
                  }}>
                  {t("cancel")}
                </Button>
                <Button color="primary" type="submit">
                  {t("impersonate")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {componentState.teamAvailability.showModal && (
        <Dialog
          open={true}
          onOpenChange={() => {
            stateDispatcher({
              type: "CLOSE_MODAL",
            });
          }}>
          <DialogContent type="creation" size="md">
            <TeamAvailabilityModal team={componentProps.team} member={componentState.teamAvailability.user} />
          </DialogContent>
        </Dialog>
      )}
      {componentState.editSheet.showModal && (
        <EditMemberSheet
          dispatch={stateDispatcher}
          state={componentState}
          currentMember={componentProps.team.membership.role}
          teamId={componentProps.team.id}
        />
      )}
    </>
  );
}
