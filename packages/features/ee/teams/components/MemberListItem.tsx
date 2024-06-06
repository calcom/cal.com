import type { ColumnDef } from "@tanstack/react-table";
import classNames from "classnames";
import { signIn } from "next-auth/react";
import { useMemo, useRef, useReducer } from "react";
import type { Dispatch, SetStateAction } from "react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Avatar, Badge, Checkbox, DataTable } from "@calcom/ui";
import {
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";

import MemberChangeRoleModal from "./MemberChangeRoleModal";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["get"];
  members: RouterOutputs["viewer"]["teams"]["get"]["members"];
  isOrgAdminOrOwner: boolean | undefined;
  setQuery: Dispatch<SetStateAction<string>>;
}

type User = RouterOutputs["viewer"]["teams"]["get"]["members"][number];

/** TODO: Migrate the one in apps/web to tRPC package */
const useCurrentUserId = () => {
  const query = useMeQuery();
  const user = query.data;
  return user?.id;
};

const checkIsOrg = (team: Props["team"]) => {
  return team.isOrganization;
};

type Payload = {
  showModal: boolean;
  user?: User;
};

export type State = {
  changeMemberRole: Payload;
  deleteMember: Payload;
  impersonateMember: Payload;
  inviteMember: Payload;
  editSheet: Payload;
  teamAvailability: Payload;
};

export type Action =
  | {
      type:
        | "SET_CHANGE_MEMBER_ROLE_ID"
        | "SET_DELETE_ID"
        | "SET_IMPERSONATE_ID"
        | "INVITE_MEMBER"
        | "EDIT_USER_SHEET"
        | "TEAM_AVAILABILITY";
      payload: Payload;
    }
  | {
      type: "CLOSE_MODAL";
    };

const initialState: State = {
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
  teamAvailability: {
    showModal: false,
  },
};

function reducer(state: State, action: Action): State {
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
    case "TEAM_AVAILABILITY":
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

export default function MemberListItem(props: Props) {
  const { t, i18n } = useLocale();

  const utils = trpc.useUtils();
  const [state, dispatch] = useReducer(reducer, initialState);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
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

  const ownersInTeam = () => {
    const { members } = props.team;
    const owners = members.filter((member) => member["role"] === MembershipRole.OWNER && member["accepted"]);
    return owners.length;
  };

  const currentUserId = useCurrentUserId();

  const removeMember = () =>
    removeMemberMutation.mutate({
      teamId: [props.team?.id],
      memberId: [state.deleteMember.user?.id as number],
      isOrg: checkIsOrg(props.team),
    });

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<User>[] = [
      // Disabling select for this PR: Will work on actions etc in a follow up
      {
        id: "select",
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
        header: `Member (${props.members.length})`,
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore Weird typing issue
          return rows.getValue(id).includes(filterValue);
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
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          const editMode =
            (props.team.membership?.role === MembershipRole.OWNER &&
              (user.role !== MembershipRole.OWNER || ownersInTeam() > 1 || user.id !== currentUserId)) ||
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
                <div className="flex items-center justify-center">
                  <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
                    {/* TODO: bring availability back. right now its ugly and broken
                     <Tooltip
                      content={
                        props.member.accepted
                          ? t("team_view_user_availability")
                          : t("team_view_user_availability_disabled")
                      }>
                      <Button
                        disabled={!props.member.accepted}
                        onClick={() => (props.member.accepted ? setShowTeamAvailabilityModal(true) : null)}
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
                      </Dropdown>
                    )}
                  </ButtonGroup>
                  <div className="flex md:hidden">
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
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
  }, [props.isOrgAdminOrOwner, dispatch, props.members, props.team]);

  const Data = useMemo<User[]>(() => props.members, [props.members]);

  return (
    <>
      <DataTable
        data-testId="user-list-data-table"
        onSearch={(value) => props.setQuery(value)}
        selectionOptions={[
          {
            type: "render",
            render: (table) => <></>,
          },
        ]}
        tableContainerRef={tableContainerRef}
        tableCTA={
          props.isOrgAdminOrOwner && (
            <Button
              type="button"
              color="primary"
              StartIcon="plus"
              size="sm"
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
            </Button>
          )
        }
        columns={memorisedColumns}
        data={Data}
        filterableItems={[
          {
            tableAccessor: "role",
            title: "Role",
            options: [
              { label: "Owner", value: "OWNER" },
              { label: "Admin", value: "ADMIN" },
              { label: "Member", value: "MEMBER" },
              { label: "Pending", value: "PENDING" },
            ],
          },
        ]}
      />

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

      {state.changeMemberRole.showModal && (
        <MemberChangeRoleModal
          isOpen={true}
          currentMember={props.team.membership.role}
          teamId={props.team?.id}
          memberId={state.changeMemberRole.user?.id as number}
          initialRole={state.changeMemberRole.user?.role as MembershipRole}
          onExit={() =>
            dispatch({
              type: "CLOSE_MODAL",
            })
          }
        />
      )}
    </>
  );
}
