import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

import type { MembershipRole } from "@calcom/prisma/enums";
import { Avatar, Badge, DataTable } from "@calcom/ui";

interface User {
  id: string;
  username?: string;
  email: string;
  role?: MembershipRole;
  teams: {
    id: string;
    name: string;
  }[];
  timezone?: string;
}

interface UserListTableProps {
  users: User[];
}

export function UserListTable({ users }: UserListTableProps) {
  const { data, status } = useSession();

  const memorisedColumns = useMemo(() => {
    const cols: ColumnDef<UserListTableProps["users"][number]>[] = [
      {
        id: "id",
        accessorFn: (data) => data.id,
        header: "ID",
        cell: ({ row }) => row.original.id,
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
      },
      {
        id: "teams",
        accessorFn: (data) => data.teams,
        header: "Teams",
        cell: ({ row, table }) => {
          const { teams } = row.original;
          return (
            <div className="flex flex-wrap">
              {teams.map((team) => (
                <Badge
                  key={team.id}
                  color="gray"
                  className="mb-2 mr-2"
                  onClick={() => {
                    table.getColumn("teams")?.setFilterValue(team.name);
                  }}>
                  {team.name}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (rows, id, filterValue) => {
          return filterValue.includes(rows.getValue(id));
        },
      },
    ];

    return cols;
  }, []);

  if (!data?.user) return null;

  return <DataTable columns={memorisedColumns} data={users} />;
}
