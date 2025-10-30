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

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface UsePendingReportsColumnsProps {
  t: (key: string) => string;
  canDelete?: boolean;
  onViewDetails: (entry: BookingReport) => void;
  onDelete: (entry: BookingReport) => void;
}

export function usePendingReportsColumns({
  t,
  canDelete,
  onViewDetails,
  onDelete,
}: UsePendingReportsColumnsProps) {
  return useMemo<ColumnDef<BookingReport>[]>(
    () => [
      {
        id: "emailOrDomain",
        header: t("email_slash_domain"),
        accessorKey: "bookerEmail",
        enableHiding: false,
        size: 250,
        cell: ({ row }) => {
          const email = row.original.bookerEmail;
          return (
            <div className="flex flex-col">
              <span className="text-emphasis font-medium">{email}</span>
            </div>
          );
        },
      },
      {
        id: "reportedBy",
        header: t("reported_by"),
        accessorFn: (row) => row.reporter?.email ?? "-",
        size: 250,
        cell: ({ row }) => <span className="text-default">{row.original.reporter?.email ?? "-"}</span>,
      },
      {
        id: "reason",
        header: t("reason"),
        size: 150,
        cell: ({ row }) => {
          const reason = t(row.original.reason.toLowerCase());
          const capitalizedReason = reason.charAt(0).toUpperCase() + reason.slice(1);

          return <Badge variant="blue">{capitalizedReason}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        size: 90,
        minSize: 90,
        maxSize: 90,
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
                  {canDelete && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        color="destructive"
                        StartIcon="trash"
                        onClick={() => onDelete(entry)}>
                        {t("delete")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [t, canDelete, onViewDetails, onDelete]
  );
}
