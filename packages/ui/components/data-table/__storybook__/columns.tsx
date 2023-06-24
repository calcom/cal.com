import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "../../badge";
import type { FilterableItems } from "../DataTableToolbar";
import type { DataTableUserStorybook } from "./data";

export const columns: ColumnDef<DataTableUserStorybook>[] = [
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row, table }) => {
      const user = row.original;
      const BadgeColor = user.role === "admin" ? "blue" : "gray";

      return (
        <Badge
          color={BadgeColor}
          onClick={() => {
            table.getColumn("role")?.setFilterValue(user.role);
          }}>
          {user.role}
        </Badge>
      );
    },
    filterFn: (rows, id, filterValue) => {
      return filterValue.includes(rows.getValue(id));
    },
  },
];

export const filterableItems: FilterableItems = [
  {
    title: "Role",
    tableAccessor: "role",
    options: [
      {
        label: "Admin",
        value: "admin",
      },
      {
        label: "User",
        value: "user",
      },
      {
        label: "Owner",
        value: "owner",
      },
    ],
  },
];
