import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, LinkIcon, LogOut, MoreHorizontal, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc";
import {
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Checkbox,
  ConfirmationDialogContent,
  DataTable,
  Dialog,
  DialogTrigger,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  showToast,
} from "@calcom/ui";

import { useOrgBrandingValues } from "../../ee/organizations/hooks";
import { subdomainSuffix } from "../../ee/organizations/lib/orgDomains";

interface User {
  id: string;
  username?: string;
  email: string;
  role?: MembershipRole;
  teams: {
    id: string;
    name: string;
    slug: string;
    role: MembershipRole;
  }[];
  timezone?: string;
}

interface UserListTableProps {
  users: User[];
  currentTeam: RouterOutputs["viewer"]["organizations"]["listMembers"] | undefined;
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

  const isInviteOpen = !currentTeam?.membership.accepted;

  const isOwner = currentTeam?.membership.role === MembershipRole.OWNER;

  const isAdminOrOwner =
    currentTeam &&
    (currentTeam.membership.role === MembershipRole.OWNER ||
      currentTeam.membership.role === MembershipRole.ADMIN);

  return (
    <ButtonGroup
      combined
      containerProps={{
        className: "ml-auto justify-end",
      }}>
      {user.username && (
        <Tooltip content={t("copy_link_team")}>
          <Button
            color="secondary"
            onClick={() => {
              // TODO Fix for orgs
              navigator.clipboard.writeText(`${orgSlug}.${subdomainSuffix()}/${user.username}`);
              // process.env.NEXT_PUBLIC_WEBSITE_URL + "/team/" + team.slug
              showToast(t("link_copied"), "success");
            }}
            variant="icon"
            StartIcon={LinkIcon}
          />
        </Tooltip>
      )}
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button
            className="radix-state-open:rounded-r-md"
            type="button"
            color="secondary"
            variant="icon"
            StartIcon={MoreHorizontal}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isAdminOrOwner && (
            <>
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  href={"/settings/teams/" + user.id + "/profile"}
                  StartIcon={Edit2}>
                  {t("edit_team") as string}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {isOwner && (
            <DropdownMenuItem>
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownItem
                    color="destructive"
                    type="button"
                    StartIcon={Trash}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}>
                    {t("disband_team")}
                  </DropdownItem>
                </DialogTrigger>
                <ConfirmationDialogContent
                  variety="danger"
                  title={t("disband_team")}
                  confirmBtnText={t("confirm_disband_team")}
                  // isLoading={props.isLoading}
                  onConfirm={() => {
                    // props.onActionSelect("disband");
                  }}>
                  {t("disband_team_confirmation_message")}
                </ConfirmationDialogContent>
              </Dialog>
            </DropdownMenuItem>
          )}

          {isOwner && (
            <DropdownMenuItem>
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownItem
                    color="destructive"
                    type="button"
                    StartIcon={LogOut}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}>
                    {t("leave_team")}
                  </DropdownItem>
                </DialogTrigger>
                <ConfirmationDialogContent
                  variety="danger"
                  title={t("leave_team")}
                  // onConfirm={declineInvite}
                  confirmBtnText={t("confirm_leave_team")}>
                  {t("leave_team_confirmation_message")}
                </ConfirmationDialogContent>
              </Dialog>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </Dropdown>
    </ButtonGroup>
  );
}

export function UserListTable({ users, currentTeam }: UserListTableProps) {
  const { data, status } = useSession();
  const orgValues = useOrgBrandingValues();

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
  }, [currentTeam, status, orgSlug]);

  if (!data?.user) return null;

  return (
    <DataTable
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
