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

type BlocklistEntry = RouterOutputs["viewer"]["organizations"]["listWatchlistEntries"]["rows"][number];

interface UseBlockedEntriesColumnsProps {
  t: (key: string) => string;
  canDelete?: boolean;
  onViewDetails: (entry: BlocklistEntry) => void;
  onDelete: (entry: BlocklistEntry) => void;
}

export function useBlockedEntriesColumns({
  t,
  canDelete,
  onViewDetails,
  onDelete,
}: UseBlockedEntriesColumnsProps) {
  return useMemo<ColumnDef<BlocklistEntry>[]>(
    () => [
      {
        id: "email_slash_domain",
        header: t("email_slash_domain"),
        accessorKey: "value",
        enableHiding: false,
        cell: ({ row }) => <span className="text-emphasis">{row.original.value}</span>,
      },
      {
        id: "type",
        header: t("type"),
        accessorKey: "type",
        size: 100,
        cell: ({ row }) => (
          <Badge variant="blue">{row.original.type === "EMAIL" ? t("email") : t("domain")}</Badge>
        ),
      },
      {
        id: "createdBy",
        header: t("blocked_by"),
        size: 180,
        cell: ({ row }) => {
          const audit = row.original.latestAudit as
            | { changedByUserId: number | null }
            | {
                changedByUser?: { id: number; email: string; name: string | null } | undefined;
                changedByUserId: number | null;
              }
            | null;
          const email =
            (audit && "changedByUser" in audit ? audit.changedByUser?.email : undefined) ?? undefined;
          return <span className="text-default">{email ?? "—"}</span>;
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
                        {t("remove_from_blocklist")}
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
