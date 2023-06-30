import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useMemo, useRef, useCallback, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import { Avatar, Badge, Checkbox, DataTable, showToast } from "@calcom/ui";

import { useOrgBrandingValues } from "../../../ee/organizations/hooks";

interface User {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  accepted: boolean;
  teams: {
    id: number;
    name: string;
    slug: string | null;
  }[];
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

export function UserListTable() {
  const orgValues = useOrgBrandingValues();

  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  const orgSlug = orgValues?.slug || "error";

  const memorisedColumns = useMemo(() => {
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
        cell: ({ row, table }) => {
          const { teams } = row.original;
          return (
            <div className="flex h-full flex-wrap items-center gap-2">
              {teams.map((team) => (
                <Badge
                  key={team.id}
                  variant="gray"
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
      // {
      //   id: "actions",
      //   cell: ({ row }) => {
      //     const user = row.original;
      //     return <TableActions user={user} orgSlug={orgSlug} currentTeam={rows} />;
      //   },
      // },
    ];

    return cols;
  }, []);

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);
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
    <DataTable
      tableContainerRef={tableContainerRef}
      columns={memorisedColumns}
      data={flatData}
      isLoading={isLoading}
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
  );
}
