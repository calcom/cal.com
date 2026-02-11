"use client";

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
import { usePathname } from "next/navigation";
import { useQueryState, parseAsBoolean } from "nuqs";
import posthog from "posthog-js";
import { useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import {
  DataTableProvider,
  useDataTable,
  useFetchMoreOnBottomReached,
  useColumnFilters,
  convertFacetedValuesToMap,
} from "@calcom/features/data-table";
import {
  DataTableToolbar,
  DataTableFilters,
  DataTableWrapper,
  DataTableSelectionBar,
} from "~/data-table/components";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import {
  DialogContent,
  DialogFooter,
  DialogClose,
  ConfirmationDialogContent,
} from "@calcom/ui/components/dialog";
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
import TeamAvailabilityModal from "@calcom/web/modules/ee/teams/components/TeamAvailabilityModal";
import { DynamicLink } from "@calcom/web/modules/users/components/UserTable/BulkActions/DynamicLink";
import type { MemberPermissions } from "@calcom/features/pbac/lib/team-member-permissions";

import DeleteBulkTeamMembers from "./DeleteBulkTeamMembers";
import { EditMemberSheet } from "./EditMemberSheet";
import { EventTypesList } from "./EventTypesList";

interface Props {
  team: NonNullable<RouterOutputs["viewer"]["teams"]["get"]>;
  isOrgAdminOrOwner: boolean | undefined;
  setShowMemberInvitationModal: Dispatch<SetStateAction<boolean>>;
}

export type User = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

const checkIsOrg = (team: Props["team"]) => {
  return team.isOrganization;
};

type Payload = {
  showModal: boolean;
  user?: User;
};

export type State = {
  deleteMember: Payload;
  impersonateMember: Payload;
  editSheet: Payload;
  teamAvailability: Payload;
};

export type Action =
  | {
      type:
        | "SET_DELETE_ID"
        | "SET_IMPERSONATE_ID"
        | "EDIT_USER_SHEET"
        | "TEAM_AVAILABILITY"
        | "INVITE_MEMBER";
      payload: Payload;
    }
  | {
      type: "CLOSE_MODAL";
    };

const initialState: State = {
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

const initalColumnVisibility = {
  select: true,
  member: true,
  role: true,
  teams: true,
  actions: true,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DELETE_ID":
      return { ...state, deleteMember: action.payload };
    case "SET_IMPERSONATE_ID":
      return { ...state, impersonateMember: action.payload };
    case "EDIT_USER_SHEET":
      return { ...state, editSheet: action.payload };
    case "TEAM_AVAILABILITY":
      return { ...state, teamAvailability: action.payload };
    case "CLOSE_MODAL":
      return {
        ...state,
        deleteMember: { showModal: false },
        impersonateMember: { showModal: false },
        editSheet: { showModal: false },
        teamAvailability: { showModal: false },
      };
    default:
      return state;
  }
}

interface Props {
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
  permissions: MemberPermissions;
}

export default function MemberList(props: Props) {
  const pathname = usePathname();
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname}>
      <MemberListContent {...props} />
    </DataTableProvider>
  );
}

function MemberListContent(props: Props) {
  const { facetedTeamValues } = props;
  const [dynamicLinkVisible, setDynamicLinkVisible] = useQueryState("dynamicLink", parseAsBoolean);
  const { t, i18n } = useLocale();
  const { data: session } = useSession();

  const utils = trpc.useUtils();
  const orgBranding = useOrgBranding();
  const domain = orgBranding?.fullDomain ?? WEBAPP_URL;

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);

  const { searchTerm } = useDataTable();

  const { data, isPending, hasNextPage, fetchNextPage, isFetching } =
    trpc.viewer.teams.listMembers.useInfiniteQuery(
      {
        limit: 10,
        searchTerm,
        teamId: props.team.id,
        // TODO: send `columnFilters` to server for server side filtering
        // filters: columnFilters,
      },
      {
        enabled: !!props.team.id,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      }
    );

  const columnFilters = useColumnFilters();
  const [rowSelection, setRowSelection] = useState({});

  const removeMemberFromCache = ({
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
      (data) => {
        if (!data) {
          return {
            pages: [],
            pageParams: [],
          };
        }

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            members: page.members.filter((member) => member.id !== memberId),
          })),
        };
      }
    );
  };

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onMutate: async ({ teamIds }) => {
      await utils.viewer.teams.listMembers.cancel();
      const previousValue = utils.viewer.teams.listMembers.getInfiniteData({
        limit: 10,
        teamId: teamIds[0],
        searchTerm,
      });

      if (previousValue) {
        removeMemberFromCache({
          utils,
          memberId: state.deleteMember.user?.id as number,
          teamId: teamIds[0],
          searchTerm,
        });
      }
      return { previousValue };
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.invalidate();
      await utils.viewer.organizations.listMembers.invalidate();
      await utils.viewer.organizations.getMembers.invalidate();
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const resendInvitationMutation = trpc.viewer.teams.resendInvitation.useMutation({
    onSuccess: () => {
      showToast(t("invitation_resent"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  // const ownersInTeam = () => {
  //   const { members } = props.team;
  //   const owners = members.filter((member) => member["role"] === MembershipRole.OWNER && member["accepted"]);
  //   return owners.length;
  // };

  const removeMember = () =>
    removeMemberMutation.mutate({
      teamIds: [props.team?.id],
      memberIds: [state.deleteMember.user?.id as number],
      isOrg: checkIsOrg(props.team),
    });

  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<User>[] = [
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
        header: "Member",
        size: 250,
        cell: ({ row }) => {
          const { username, email, avatarUrl, accepted, name } = row.original;
          const memberName =
            name ||
            (() => {
              const emailName = email.split("@")[0];
              return emailName.charAt(0).toUpperCase() + emailName.slice(1);
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
                  {memberName}
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
        filterFn: (rows, id, filterValue) => {
          const { data } = filterValue;
          const userEmail = rows.original.email;
          return data.includes(userEmail);
        },
      },
      {
        id: "role",
        accessorFn: (data) => data.role,
        header: "Role",
        size: 100,
        cell: ({ row, table }) => {
          const { role, accepted, customRole } = row.original;
          const roleName = customRole?.name || role;
          const roleIdentifier = customRole?.id || role;
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
                  table.getColumn("role")?.setFilterValue([roleIdentifier]);
                }}>
                {roleName}
              </Badge>
            </div>
          );
        },
        filterFn: (rows, id, filterValue) => {
          const { data } = filterValue;
          const { role, accepted, customRole } = rows.original;
          const roleIdentifier = customRole?.id || role;

          if (data.includes("PENDING")) {
            if (data.length === 1) return !accepted;
            else return !accepted || data.includes(roleIdentifier);
          }

          // Show only the selected roles (check both traditional role and custom role ID)
          return data.includes(roleIdentifier);
        },
      },
      {
        id: "lastActiveAt",
        header: "Last Active",
        cell: ({ row }) => <div>{row.original.lastActiveAt}</div>,
      },
      {
        id: "actions",
        size: 90,
        enableResizing: false,
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === session?.user.id;
          // TODO(SEAN) In a follow up can we rename canChangeMemberRole to canEditMembers - role is a bit specific.
          const canChangeRole = props.permissions?.canChangeMemberRole ?? false;
          const canRemove = props.permissions?.canRemove ?? false;
          const canImpersonate = props.permissions?.canImpersonate ?? false;
          const canResendInvitation = props.permissions?.canInvite ?? false;
          const editMode =
            [canChangeRole, canRemove, canImpersonate, canResendInvitation].some(Boolean) && !isSelf;

          const impersonationMode =
            canImpersonate &&
            !user.disableImpersonation &&
            user.accepted &&
            process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "true";
          return (
            <>
              {props.team.membership?.accepted && (
                <div className="flex items-center justify-end">
                  <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
                    {/* TODO: bring availability back. right now its ugly and broken
                    <Tooltip
                      content={
                        user.accepted
                          ? t("team_view_user_availability")
                          : t("team_view_user_availability_disabled")
                      }>
                      <Button
                        disabled={!user.accepted}
                        onClick={() =>
                          user.accepted
                            ? dispatch({
                                type: "TEAM_AVAILABILITY",
                                payload: {
                                  user,
                                  showModal: true,
                                },
                              })
                            : null
                        }
                        color="secondary"
                        variant="icon"
                        StartIcon="clock"
                      />
                    </Tooltip> */}
                    {!!user.accepted && (
                      <Tooltip content={t("view_public_page")}>
                        <Button
                          target="_blank"
                          href={`${user.bookerUrl}/${user.username}`}
                          color="secondary"
                          className={classNames(!editMode ? "rounded-r-md" : "")}
                          variant="icon"
                          StartIcon="external-link"
                          disabled={!user.accepted}
                        />
                      </Tooltip>
                    )}
                    {editMode && (
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="ltr:radix-state-open:rounded-r-(--btn-group-radius) rtl:radix-state-open:rounded-l-(--btn-group-radius)"
                            color="secondary"
                            variant="icon"
                            StartIcon="ellipsis"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuContent>
                            {canChangeRole ? (
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  onClick={() =>
                                    dispatch({
                                      type: "EDIT_USER_SHEET",
                                      payload: {
                                        user,
                                        showModal: true,
                                      },
                                    })
                                  }
                                  StartIcon="pencil">
                                  {t("edit")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            ) : null}
                            {impersonationMode && (
                              <>
                                <DropdownMenuItem>
                                  <DropdownItem
                                    type="button"
                                    onClick={() =>
                                      dispatch({
                                        type: "SET_IMPERSONATE_ID",
                                        payload: {
                                          user,
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
                            {canResendInvitation && (
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  onClick={() => {
                                    resendInvitationMutation.mutate({
                                      teamId: props.team?.id,
                                      email: user.email,
                                      language: i18n.language,
                                    });
                                  }}
                                  StartIcon="send">
                                  {t("resend_invitation")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            )}
                            {canRemove ? (
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  onClick={() =>
                                    dispatch({
                                      type: "SET_DELETE_ID",
                                      payload: {
                                        user,
                                        showModal: true,
                                      },
                                    })
                                  }
                                  color="destructive"
                                  StartIcon="user-x">
                                  {t("remove")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenuPortal>
                      </Dropdown>
                    )}
                  </ButtonGroup>
                  <div className="flex md:hidden">
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent>
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              disabled={!user.accepted}
                              href={!user.accepted ? undefined : `/${user.username}`}
                              target="_blank"
                              type="button"
                              StartIcon="external-link">
                              {t("view_public_page")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          {editMode && (
                            <>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  onClick={() =>
                                    dispatch({
                                      type: "EDIT_USER_SHEET",
                                      payload: {
                                        user,
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
                                    dispatch({
                                      type: "SET_DELETE_ID",
                                      payload: {
                                        user,
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

    return cols;
  }, [props.isOrgAdminOrOwner, dispatch, totalRowCount, session?.user.id]);
  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.members) ?? [], [data]) as User[];

  const table = useReactTable({
    data: flatData,
    columns: memorisedColumns,
    enableRowSelection: true,
    debugTable: true,
    manualPagination: true,
    initialState: {
      columnVisibility: initalColumnVisibility,
      columnPinning: {
        right: ["actions"],
      },
    },
    state: {
      columnFilters,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: (_, columnId) => () => {
      if (facetedTeamValues) {
        switch (columnId) {
          case "role": {
            // Include both traditional roles and PBAC custom roles
            const allRoles = facetedTeamValues.roles.map((role) => ({
              label: role.name,
              value: role.id,
            }));

            return convertFacetedValuesToMap(allRoles);
          }
          default:
            return new Map();
        }
      }
      return new Map();
    },
    getRowId: (row) => `${row.id}`,
  });

  useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  return (
    <>
      <DataTableWrapper
        testId="team-member-list-container"
        table={table}
        tableContainerRef={tableContainerRef}
        isPending={isPending}
        enableColumnResizing={true}
        paginationMode="infinite"
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetching={isFetching}
        totalRowCount={totalRowCount}
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
            <DataTableFilters.ColumnVisibilityButton table={table} />
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ClearFiltersButton />
            {props.permissions.canInvite && (
              <DataTableToolbar.CTA
                type="button"
                color="primary"
                StartIcon="plus"
                onClick={() => {
                  props.setShowMemberInvitationModal(true);
                  posthog.capture("teams_add_new_members_button_clicked");
                }}
                data-testid="new-member-button">
                {t("add")}
              </DataTableToolbar.CTA>
            )}
          </>
        }>
        {numberOfSelectedRows >= 2 && dynamicLinkVisible && (
          <DataTableSelectionBar.Root className="bottom-[7.3rem]! md:bottom-32!">
            <DynamicLink table={table} domain={domain} />
          </DataTableSelectionBar.Root>
        )}
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="bottom-16! justify-center md:w-max">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            {numberOfSelectedRows >= 2 && (
              <DataTableSelectionBar.Button
                color="secondary"
                onClick={() => setDynamicLinkVisible(!dynamicLinkVisible)}
                icon="handshake">
                {t("group_meeting")}
              </DataTableSelectionBar.Button>
            )}
            <EventTypesList table={table} teamId={props.team.id} />
            <DeleteBulkTeamMembers
              users={table.getSelectedRowModel().flatRows.map((row) => row.original)}
              onRemove={() => table.toggleAllPageRowsSelected(false)}
              isOrg={checkIsOrg(props.team)}
              teamId={props.team.id}
            />
          </DataTableSelectionBar.Root>
        )}
      </DataTableWrapper>
      {state.deleteMember.showModal && (
        <Dialog
          open={true}
          onOpenChange={(open) =>
            !open &&
            dispatch({
              type: "CLOSE_MODAL",
            })
          }>
          <ConfirmationDialogContent
            variety="danger"
            title={t("remove_member")}
            confirmBtnText={t("confirm_remove_member")}
            onConfirm={removeMember}>
            {t("remove_member_confirmation_message")}
          </ConfirmationDialogContent>
        </Dialog>
      )}

      {state.impersonateMember.showModal && state.impersonateMember.user?.username && (
        <Dialog
          open={true}
          onOpenChange={() =>
            dispatch({
              type: "CLOSE_MODAL",
            })
          }>
          <DialogContent type="creation" title={t("impersonate")} description={t("impersonation_user_tip")}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn("impersonation-auth", {
                  username: state.impersonateMember.user?.email,
                  teamId: props.team.id,
                });
                dispatch({
                  type: "CLOSE_MODAL",
                });
              }}>
              <DialogFooter showDivider className="mt-8">
                <DialogClose color="secondary">{t("cancel")}</DialogClose>
                <Button color="primary" type="submit">
                  {t("impersonate")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {state.teamAvailability.showModal && (
        <Dialog
          open={true}
          onOpenChange={() => {
            dispatch({
              type: "CLOSE_MODAL",
            });
          }}>
          <DialogContent type="creation" size="md">
            <TeamAvailabilityModal team={props.team} member={state.teamAvailability.user} />
          </DialogContent>
        </Dialog>
      )}
      {state.editSheet.showModal && (
        <EditMemberSheet
          dispatch={dispatch}
          state={state}
          currentMember={props.team.membership.role}
          teamId={props.team.id}
          permissions={props.permissions}
        />
      )}
    </>
  );
}
