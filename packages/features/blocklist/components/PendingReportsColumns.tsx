"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

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

import type { GroupedBookingReport, BlocklistScope } from "../types";

interface UsePendingReportsColumnsProps<T extends GroupedBookingReport> {
  t: (key: string) => string;
  scope: BlocklistScope;
  enableRowSelection?: boolean;
  onViewDetails: (entry: T) => void;
}

export function usePendingReportsColumns<T extends GroupedBookingReport>({
  t,
  scope,
  enableRowSelection = false,
  onViewDetails,
}: UsePendingReportsColumnsProps<T>) {
  const isSystem = scope === "system";

  return useMemo<ColumnDef<T>[]>(() => {
    const columns: ColumnDef<T>[] = [];

    if (enableRowSelection) {
      columns.push({
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
        size: 24,
        minSize: 24,
        maxSize: 24,
      });
    }

    columns.push({
      id: "emailOrDomain",
      header: t("email_slash_domain"),
      accessorKey: "bookerEmail",
      enableHiding: false,
      size: isSystem ? 200 : 250,
      cell: ({ row }) => {
        const { bookerEmail, reportCount } = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className={`text-emphasis ${isSystem ? "break-words text-sm" : ""} font-medium`}>
              {bookerEmail}
            </span>
            {reportCount > 1 && (
              <Badge variant="gray" size="sm">
                {reportCount}
              </Badge>
            )}
          </div>
        );
      },
    });

    if (isSystem) {
      columns.push({
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
      });
    }

    columns.push({
      id: "reportedBy",
      header: t("reported_by"),
      accessorFn: (row) => row.reporter?.email ?? "-",
      size: isSystem ? 180 : 250,
      cell: ({ row }) => (
        <span className={`text-default ${isSystem ? "wrap-break-word block text-sm" : ""}`}>
          {row.original.reporter?.email ?? "-"}
        </span>
      ),
    });

    columns.push({
      id: "reason",
      header: t("reason"),
      size: isSystem ? 120 : 150,
      cell: ({ row }) => {
        const reason = t(row.original.reason.toLowerCase());
        const capitalizedReason = reason.charAt(0).toUpperCase() + reason.slice(1);

        return (
          <Badge variant="blue" className={isSystem ? "text-xs" : ""}>
            {capitalizedReason}
          </Badge>
        );
      },
    });

    columns.push({
      id: "actions",
      header: "",
      size: isSystem ? 60 : 90,
      minSize: isSystem ? 60 : 90,
      maxSize: isSystem ? 60 : 90,
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
    });

    return columns;
  }, [t, scope, isSystem, enableRowSelection, onViewDetails]);
}
