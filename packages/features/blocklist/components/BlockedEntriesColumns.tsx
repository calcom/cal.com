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

import type { BlocklistEntry, BlocklistScope } from "../types";

interface UseBlockedEntriesColumnsProps<T extends BlocklistEntry> {
  t: (key: string) => string;
  scope: BlocklistScope;
  canDelete?: boolean;
  enableRowSelection?: boolean;
  onViewDetails: (entry: T) => void;
  onDelete: (entry: T) => void;
}

export function useBlockedEntriesColumns<T extends BlocklistEntry>({
  t,
  scope,
  canDelete = true,
  enableRowSelection = false,
  onViewDetails,
  onDelete,
}: UseBlockedEntriesColumnsProps<T>) {
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
            aria-label={t("select_all")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("select_row")}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 24,
        minSize: 24,
        maxSize: 24,
      });
    }

    columns.push(
      {
        id: "email_slash_domain",
        header: t("email_slash_domain"),
        accessorKey: "value",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-emphasis">{row.original.value}</span>
            {row.original.isGlobal && !isSystem && (
              <Badge variant="gray" className="text-xs">
                {t("system_blocked")}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "type",
        header: t("type"),
        accessorKey: "type",
        size: 100,
        cell: ({ row }) => (
          <Badge variant="blue">{row.original.type === "EMAIL" ? t("email") : t("domain")}</Badge>
        ),
      }
    );

    if (isSystem) {
      columns.push({
        id: "source",
        header: t("source"),
        accessorKey: "source",
        size: 120,
        cell: ({ row }) => {
          const source = row.original.source;
          let label = t("manual");
          if (source === "FREE_DOMAIN_POLICY") {
            label = t("free_domain_policy");
          }
          return <span className="text-default">{label}</span>;
        },
      });
    }

    columns.push({
      id: "createdBy",
      header: t("blocked_by"),
      size: 180,
      cell: ({ row }) => {
        const audit = row.original.latestAudit;
        const email = audit && "changedByUser" in audit ? audit.changedByUser?.email : undefined;
        return <span className="text-default">{email ?? "—"}</span>;
      },
    });

    columns.push({
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
        const isEntryReadOnly = entry.isReadOnly === true;
        const showDeleteOption = canDelete && !isEntryReadOnly;
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
                {showDeleteOption && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      color="destructive"
                      StartIcon="trash"
                      onClick={() => onDelete(entry)}>
                      {t("remove_from_blocklist")}
                    </DropdownItem>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </Dropdown>
          </div>
        );
      },
    });

    return columns;
  }, [t, scope, isSystem, canDelete, enableRowSelection, onViewDetails, onDelete]);
}
