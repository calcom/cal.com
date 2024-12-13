"use client";

import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnFiltersState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import classNames from "classnames";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  DataTable,
  DataTableToolbar,
  DataTableFilters,
  DataTableSelectionBar,
  useFetchMoreOnBottomReached,
} from "@calcom/features/data-table";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { DynamicLink } from "@calcom/features/users/components/UserTable/BulkActions/DynamicLink";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Checkbox,
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownItem,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";

import DeleteBulkTeamMembers from "./DeleteBulkTeamMembers";
import { EditMemberSheet } from "./EditMemberSheet";
import { EventTypesList } from "./EventTypesList";
import TeamAvailabilityModal from "./TeamAvailabilityModal";

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
}

export default function MemberList(props: Props) {
  const [dynamicLinkVisible, setDynamicLinkVisible] = useQueryState("dynamicLink", parseAsBoolean);
  const { t, i18n } = useLocale();
  const { data: session } = useSession();

  const utils = trpc.useUtils();
  const orgBranding = useOrgBranding();
  const domain = orgBranding?.fullDomain ?? WEBAPP_URL;

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const { data, isPending, hasNextPage, fetchNextPage, isFetching } =
    trpc.viewer.teams.listMembers.useInfiniteQuery(
      {
        limit: 10,
        searchTerm: debouncedSearchTerm,
        teamId: props.team.id,
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

  // TODO (SEAN): Make Column filters a trpc query param so we can fetch serverside even if the data is not loaded
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
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
        searchTerm: debouncedSearchTerm,
      });

      if (previousValue) {
        removeMemberFromCache({
          utils,
          memberId: state.deleteMember.user?.id as number,
          teamId: teamIds[0],
          searchTerm: debouncedSearchTerm,
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

  const isAdminOrOwner =
    props.team.membership.role === MembershipRole.OWNER ||
    props.team.membership.role === MembershipRole.ADMIN;

  const removeMember = () =>
    removeMemberMutation.mutate({
      teamIds: [props.team?.id],
      memberIds: [state.deleteMember.user?.id as number],
      isOrg: checkIsOrg(props.team),
    });

  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<User>[] = [
      // Disabling select for this PR: Will work on actions etc in a follow up
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
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
        header: `Member (${totalDBRowCount})`,
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
          const { role, accepted } = row.original;
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
                  table.getColumn("role")?.setFilterValue([role]);
                }}>
                {role}
              </Badge>
            </div>
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
        id: "lastActiveAt",
        header: "Last Active",
        cell: ({ row }) => <div>{row.original.lastActiveAt}</div>,
      },
      {
        id: "actions",
        size: 80,
        meta: {
          sticky: { position: "right" },
        },
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === session?.user.id;
          const editMode =
            (props.team.membership?.role === MembershipRole.OWNER &&
              (user.role !== MembershipRole.OWNER || !isSelf)) ||
            (props.team.membership?.role === MembershipRole.ADMIN && user.role !== MembershipRole.OWNER) ||
            props.isOrgAdminOrOwner;
          const impersonationMode =
            editMode &&
            !user.disableImpersonation &&
            user.accepted &&
            process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "true";
          const resendInvitation = editMode && !user.accepted;
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
                            className="radix-state-open:rounded-r-md"
                            color="secondary"
                            variant="icon"
                            StartIcon="ellipsis"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuContent>
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
                            {resendInvitation && (
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
  }, [props.isOrgAdminOrOwner, dispatch, totalDBRowCount, session?.user.id]);
  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.members) ?? [], [data]) as User[];
  const totalFetched = flatData.length;

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
      rowSelection,
    },
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => `${row.id}`,
  });

  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  return (
    <>
      <DataTable
        data-testid="team-member-list-container"
        table={table}
        tableContainerRef={tableContainerRef}
        isPending={isPending}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
        <DataTableToolbar.Root>
          <div className="flex w-full gap-2">
            <DataTableToolbar.SearchBar table={table} onSearch={(value) => setDebouncedSearchTerm(value)} />
            <DataTableFilters.FilterButton table={table} />
            <DataTableFilters.ColumnVisibilityButton table={table} />
            {isAdminOrOwner && (
              <DataTableToolbar.CTA
                type="button"
                color="primary"
                StartIcon="plus"
                className="rounded-md"
                onClick={() => props.setShowMemberInvitationModal(true)}
                data-testid="new-member-button">
                {t("add")}
              </DataTableToolbar.CTA>
            )}
          </div>
          <div className="flex gap-2 justify-self-start">
            <DataTableFilters.ActiveFilters table={table} />
          </div>
        </DataTableToolbar.Root>

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
            {numberOfSelectedRows >= 2 && (
              <DataTableSelectionBar.Button
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
      </DataTable>
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
        />
      )}
    </>
  );
}
