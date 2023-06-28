import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import { Avatar, Badge, Checkbox, DataTable, showToast } from "@calcom/ui";

import { useOrgBrandingValues } from "../../../ee/organizations/hooks";
import { useOrgMemberStore } from "./store";

interface User {
  id: string;
  username?: string;
  email: string;
  role?: MembershipRole;
  teams: {
    id: string;
    name: string;
    slug: string;
  }[];
  timezone?: string;
}

interface UserListTableProps {
  users: User[];
}

function TableActions({
  user,
  orgSlug,
  currentTeam,
}: {
  user: User;
  orgSlug: string;
  currentTeam: RouterOutputs["viewer"]["organizations"]["listMembers"] | undefined;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const utils = trpc.useContext();
  const membershipPermissions = useOrgMemberStore((state) => state.permissions);

  const ownersInTeam = () => {
    const owners = currentTeam?.members.filter(
      (member) => member["role"] === MembershipRole.OWNER && member["accepted"]
    );
    return owners ? owners.length : 0;
  };

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

  return null;

  // return (
  //   <>
  //     <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
  //       {/* TODO: bring availability back. right now its ugly and broken
  //              <Tooltip
  //               content={
  //                 props.member.accepted
  //                   ? t("team_view_user_availability")
  //                   : t("team_view_user_availability_disabled")
  //               }>
  //               <Button
  //                 disabled={!props.member.accepted}
  //                 onClick={() => (props.member.accepted ? setShowTeamAvailabilityModal(true) : null)}
  //                 color="secondary"
  //                 variant="icon"
  //                 StartIcon={Clock}
  //               />
  //             </Tooltip> */}
  //       <Tooltip content={t("view_public_page")}>
  //         <Button
  //           target="_blank"
  //           href={"/" + props.member.username}
  //           color="secondary"
  //           className={classNames(!editMode ? "rounded-r-md" : "")}
  //           variant="icon"
  //           StartIcon={ExternalLink}
  //         />
  //       </Tooltip>
  //       {editMode && (
  //         <Dropdown>
  //           <DropdownMenuTrigger asChild>
  //             <Button
  //               className="radix-state-open:rounded-r-md"
  //               color="secondary"
  //               variant="icon"
  //               StartIcon={MoreHorizontal}
  //             />
  //           </DropdownMenuTrigger>
  //           <DropdownMenuContent>
  //             <DropdownMenuItem>
  //               <DropdownItem
  //                 type="button"
  //                 // onClick={() => setShowChangeMemberRoleModal(true)}
  //                 StartIcon={Edit2}>
  //                 {t("edit")}
  //               </DropdownItem>
  //             </DropdownMenuItem>
  //             {impersonationMode && (
  //               <>
  //                 <DropdownMenuItem>
  //                   <DropdownItem
  //                     type="button"
  //                     // onClick={() => setShowImpersonateModal(true)}
  //                     StartIcon={Lock}>
  //                     {t("impersonate")}
  //                   </DropdownItem>
  //                 </DropdownMenuItem>
  //                 <DropdownMenuSeparator />
  //               </>
  //             )}
  //             <DropdownMenuItem>
  //               <DropdownItem
  //                 type="button"
  //                 // onClick={() => setShowDeleteModal(true)}
  //                 color="destructive"
  //                 StartIcon={UserX}>
  //                 {t("remove")}
  //               </DropdownItem>
  //             </DropdownMenuItem>
  //           </DropdownMenuContent>
  //         </Dropdown>
  //       )}
  //     </ButtonGroup>
  //     <div className="flex md:hidden">
  //       <Dropdown>
  //         <DropdownMenuTrigger asChild>
  //           <Button type="button" variant="icon" color="minimal" StartIcon={MoreHorizontal} />
  //         </DropdownMenuTrigger>
  //         <DropdownMenuContent>
  //           <DropdownMenuItem className="outline-none">
  //             <DropdownItem type="button" StartIcon={ExternalLink}>
  //               {t("view_public_page")}
  //             </DropdownItem>
  //           </DropdownMenuItem>
  //           {editMode && (
  //             <>
  //               <DropdownMenuItem>
  //                 <DropdownItem
  //                   type="button"
  //                   // onClick={() => setShowChangeMemberRoleModal(true)}
  //                   StartIcon={Edit2}>
  //                   {t("edit")}
  //                 </DropdownItem>
  //               </DropdownMenuItem>
  //               <DropdownMenuItem>
  //                 <DropdownItem
  //                   type="button"
  //                   color="destructive"
  //                   // onClick={() => setShowDeleteModal(true)}
  //                   StartIcon={UserX}>
  //                   {t("remove")}
  //                 </DropdownItem>
  //               </DropdownMenuItem>
  //             </>
  //           )}
  //         </DropdownMenuContent>
  //       </Dropdown>
  //     </div>
  //   </>
  // );
}

export function UserListTable({ users }: UserListTableProps) {
  const { data } = useSession();
  const currentTeam = useOrgMemberStore((state) => state.currentTeam);
  const orgValues = useOrgBrandingValues();

  const [pagination, setPagination] = useOrgMemberStore(
    (state) => [state.pagination, state.setPagination],
    shallow
  );

  const orgSlug = orgValues?.slug || "error";

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<UserListTableProps["users"][number]>[] = [
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
          return filterValue.includes(rows.getValue(id));
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
              color={role === "MEMBER" ? "gray" : "blue"}
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
        cell: ({ row, table }) => {
          const { teams } = row.original;
          return (
            <div className="flex h-full flex-wrap items-center gap-2">
              {teams.map((team) => (
                <Badge
                  key={team.id}
                  color="gray"
                  onClick={() => {
                    table.getColumn("teams")?.setFilterValue(team.name);
                  }}>
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
          return <TableActions user={user} orgSlug={orgSlug} currentTeam={currentTeam} />;
        },
      },
    ];

    return cols;
  }, [currentTeam, orgSlug]);

  if (!data?.user) return null;

  return (
    <DataTable
      pagination={pagination}
      setPagination={setPagination}
      columns={memorisedColumns}
      data={users}
      filterableItems={[
        {
          tableAccessor: "role",
          title: "Role",
          options: [
            { label: "Member", value: "MEMBER" },
            { label: "Admin", value: "ADMIN" },
          ],
        },
      ]}
    />
  );
}
