import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useRef, useCallback, useEffect, useReducer } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { Avatar, Badge, Button, DataTable, Checkbox } from "@calcom/ui";

import { useOrgBranding } from "../../../ee/organizations/context/provider";
import { DeleteBulkUsers } from "./BulkActions/DeleteBulkUsers";
import { TeamListBulkAction } from "./BulkActions/TeamList";
import { ChangeUserRoleModal } from "./ChangeUserRoleModal";
import { DeleteMemberModal } from "./DeleteMemberModal";
import { EditUserSheet } from "./EditSheet/EditUserSheet";
import { ImpersonationMemberModal } from "./ImpersonationMemberModal";
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
  completedOnboarding: boolean;
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
  editSheet: Payload;
};

export type Action =
  | {
      type:
        | "SET_CHANGE_MEMBER_ROLE_ID"
        | "SET_DELETE_ID"
        | "SET_IMPERSONATE_ID"
        | "INVITE_MEMBER"
        | "EDIT_USER_SHEET";
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
  const { data: session } = useSession();
  const { data: currentMembership } = trpc.viewer.organizations.listCurrent.useQuery();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { t } = useLocale();
  const orgBranding = useOrgBranding();

  const { data, isLoading, fetchNextPage, isFetching } =
    trpc.viewer.organizations.listMembers.useInfiniteQuery(
      {
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
      }
    );

  const adminOrOwner = currentMembership?.user.role === "ADMIN" || currentMembership?.user.role === "OWNER";
  const domain = orgBranding?.fullDomain ?? WEBAPP_URL;

  const memorisedColumns = useMemo(() => {
    const permissions = {
      canEdit: adminOrOwner,
      canRemove: adminOrOwner,
      canResendInvitation: adminOrOwner,
      canImpersonate: false,
    };
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
        header: "Member",
        cell: ({ row }) => {
          const { username, email } = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar size="sm" alt={username || email} imageSrc={`${domain}/${username}/avatar.png`} />
              <div className="">
                <div className="text-emphasis text-sm font-medium leading-none">
                  {username || "No username"}
                </div>
                <div className="text-subtle mt-1 text-sm leading-none">{email}</div>
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
          const { role } = row.original;
          return (
            <Badge
              variant={role === "MEMBER" ? "gray" : "blue"}
              onClick={() => {
                table.getColumn("role")?.setFilterValue([role]);
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
        header: "Teams",
        cell: ({ row }) => {
          const { teams, accepted, email } = row.original;
          // TODO: Implement click to filter
          return (
            <div className="flex h-full flex-wrap items-center gap-2">
              {accepted ? null : (
                <Badge
                  variant="red"
                  className="text-xs"
                  data-testid={`email-${email.replace("@", "")}-pending`}>
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
  }, [session?.user.id, adminOrOwner, dispatch, domain]);

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

  return (
    <>
      <DataTable
        searchKey="member"
        selectionOptions={[
          {
            type: "render",
            render: (table) => <TeamListBulkAction table={table} />,
          },
          {
            type: "render",
            render: (table) => (
              <DeleteBulkUsers
                users={table.getSelectedRowModel().flatRows.map((row) => row.original)}
                onRemove={() => table.toggleAllPageRowsSelected(false)}
              />
            ),
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

      {state.deleteMember.showModal && <DeleteMemberModal state={state} dispatch={dispatch} />}
      {state.inviteMember.showModal && <InviteMemberModal dispatch={dispatch} />}
      {state.impersonateMember.showModal && <ImpersonationMemberModal dispatch={dispatch} state={state} />}
      {state.changeMemberRole.showModal && <ChangeUserRoleModal dispatch={dispatch} state={state} />}
      {state.editSheet.showModal && <EditUserSheet dispatch={dispatch} state={state} />}
    </>
  );
}
