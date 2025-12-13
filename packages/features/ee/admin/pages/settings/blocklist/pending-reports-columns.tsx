import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Checkbox } from "@calcom/ui/components/form";

type BookingReport = RouterOutputs["viewer"]["admin"]["watchlist"]["listReports"]["rows"][number];

interface UsePendingReportsColumnsProps {
  t: (key: string) => string;
  onViewDetails: (entry: BookingReport) => void;
}

export function usePendingReportsColumns({ t, onViewDetails }: UsePendingReportsColumnsProps) {
  return useMemo<ColumnDef<BookingReport>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: "emailOrDomain",
        header: t("email_slash_domain"),
        accessorKey: "bookerEmail",
        enableHiding: false,
        size: 200,
        cell: ({ row }) => {
          const email = row.original.bookerEmail;
          return (
            <div className="flex flex-col">
              <span className="text-emphasis break-words text-sm font-medium">{email}</span>
            </div>
          );
        },
      },
      {
        id: "organization",
        header: t("org"),
        size: 140,
        cell: ({ row }) => {
          const org = row.original.organization;
          if (!org) {
            return <span className="text-subtle text-sm">{t("individual")}</span>;
          }
          return <span className="text-default block truncate text-sm">{org.name}</span>;
        },
      },
      {
        id: "reportedBy",
        header: t("reported_by"),
        accessorFn: (row) => row.reporter?.email ?? "--",
        size: 180,
        cell: ({ row }) => (
          <span className="text-default wrap-break-word block text-sm">
            {row.original.reporter?.email ?? "--"}
          </span>
        ),
      },
      {
        id: "reason",
        header: t("reason"),
        size: 120,
        cell: ({ row }) => {
          const reason = t(row.original.reason.toLowerCase());
          const capitalizedReason = reason.charAt(0).toUpperCase() + reason.slice(1);

          return (
            <Badge variant="blue" className="text-xs">
              {capitalizedReason}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        size: 60,
        minSize: 60,
        maxSize: 60,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex items-center justify-end">
              <Dropdown modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <DropdownItem type="button" StartIcon="eye" onClick={() => onViewDetails(entry)}>
                      {t("view_details")}
                    </DropdownItem>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [t, onViewDetails]
  );
}
