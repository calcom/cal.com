import type { ColumnDef } from "@tanstack/react-table";
import { Plus, StopCircle, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useRef, useCallback, useEffect, useReducer } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfirmationDialogContent,
  DataTable,
  Dialog,
  showToast,
} from "@calcom/ui";

import { InviteMemberModal } from "./InviteMemberModal";
import { TableActions } from "./UserTableActions";

export interface User {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  accepted: boolean;
  disableImpersonation: boolean;
  teams: {
    id: number;
    name: string;
    slug: string | null;
  }[];
}

type Payload = {
  showModal: boolean;
  user?: User;
};

export type State = {
  changeMemberRole: Payload;
  deleteMember: Payload;
  impersonateMember: Payload;
  inviteMember: Payload;
};

export type Action =
  | {
      type: "SET_CHANGE_MEMBER_ROLE_ID" | "SET_DELETE_ID" | "SET_IMPERSONATE_ID" | "INVITE_MEMBER";
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
    case "CLOSE_MODAL":
      return {
        ...state,
        changeMemberRole: { showModal: false },
        deleteMember: { showModal: false },
        impersonateMember: { showModal: false },
        inviteMember: { showModal: false },
      };
    default:
      return state;
  }
}

export function UserListTable() {
  const { data: session } = useSession();
  const { data: currentMembership } = trpc.viewer.organizations.listCurrent.useQuery();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { data, isLoading, fetchNextPage, isFetching } =
    trpc.viewer.organizations.listMembers.useInfiniteQuery(
      {
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
      }
    );

  const adminOrOwner = currentMembership?.user.role === "ADMIN" || currentMembership?.user.role === "OWNER";

  const memorisedColumns = useMemo(() => {
    const permissions = {
      canEdit: adminOrOwner,
      canRemove: adminOrOwner,
      canImpersonate: false,
    };
    const cols: ColumnDef<User>[] = [
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
        header: "Member",
        cell: ({ row }) => {
          const { username, email } = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar size="sm" alt={username || email} imageSrc={`/${username}/avatar.png`} />
              <div className="">
                <div className="text-emphasis text-sm font-medium leading-none">
                  {username || "No username"}
                </div>
                <div className="text-subtle text-sm leading-none">{email}</div>
              </div>
            </div>
          );
        },
        filterFn: (rows, id, filterValue) => {
          console.log({
            rows,
            id,
            filterValue,
            rowValue: rows.getValue(id),
          });
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
          const { role } = row.original;
          return (
            <Badge
              variant={role === "MEMBER" ? "gray" : "blue"}
              onClick={() => {
                table.getColumn("role")?.setFilterValue(role);
              }}>
              {role}
            </Badge>
          );
        },
        filterFn: (rows, id, filterValue) => {
          return filterValue.includes(rows.getValue(id));
        },
      },
      {
        id: "teams",
        accessorFn: (data) => {
          const teamNames = [];
          for (const team of data.teams) {
            teamNames.push(team.name);
          }
          return teamNames;
        },
        header: "Teams",
        cell: ({ row }) => {
          const { teams, accepted } = row.original;
          return (
            <div className="flex h-full flex-wrap items-center gap-2">
              {accepted ? null : (
                <Badge variant="red" className="text-xs">
                  Pending
                </Badge>
              )}
              {teams.map((team) => (
                <Badge key={team.id} variant="gray">
                  {team.name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          const permissionsRaw = permissions;
          const isSelf = user.id === session?.user.id;

          const permissionsForUser = {
            canEdit: permissionsRaw.canEdit && user.accepted && !isSelf,
            canRemove: permissionsRaw.canRemove && !isSelf,
            canImpersonate: user.accepted && !user.disableImpersonation && !isSelf,
            canLeave: user.accepted && isSelf,
          };

          return <TableActions user={user} permissionsForUser={permissionsForUser} dispatch={dispatch} />;
        },
      },
    ];

    return cols;
  }, [session?.user.id, adminOrOwner, dispatch]);

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]) as User[];
  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.invalidate();
      await utils.viewer.organizations.listMembers.invalidate();
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <>
      <DataTable
        searchKey="member"
        selectionOptions={[
          {
            label: "Add To Team",
            onClick: () => {
              console.log("Add To Team");
            },
            icon: Users,
          },
          {
            label: "Delete",
            onClick: () => {
              console.log("Delete");
            },
            icon: StopCircle,
          },
        ]}
        tableContainerRef={tableContainerRef}
        tableCTA={
          adminOrOwner && (
            <Button
              type="button"
              color="primary"
              StartIcon={Plus}
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
        data={flatData}
        isLoading={isLoading}
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
        filterableItems={[
          {
            tableAccessor: "role",
            title: "Role",
            options: [
              { label: "Owner", value: "OWNER" },
              { label: "Admin", value: "ADMIN" },
              { label: "Member", value: "MEMBER" },
            ],
          },
        ]}
      />

      {state.deleteMember.showModal && state.deleteMember.user && (
        <Dialog
          open={state.deleteMember.showModal}
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
            onConfirm={() => {
              // Shouldnt ever happen just for type safety
              if (!session?.user.organizationId || !state?.deleteMember?.user?.id) return;

              removeMemberMutation.mutate({
                teamId: session?.user.organizationId,
                memberId: state?.deleteMember?.user.id,
                isOrg: true,
              });
            }}>
            {t("remove_member_confirmation_message")}
          </ConfirmationDialogContent>
        </Dialog>
      )}

      {state.inviteMember.showModal && <InviteMemberModal dispatch={dispatch} />}
    </>
  );
}
