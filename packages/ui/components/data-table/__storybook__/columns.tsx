import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "../../badge";
import { Checkbox } from "../../form";
import type { FilterableItems } from "../DataTableToolbar";
import type { DataTableUserStorybook } from "./data";

export const columns: ColumnDef<DataTableUserStorybook>[] = [
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
