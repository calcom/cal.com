"use client";

import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useCallback } from "react";

import { DataTableProvider, DataTableWrapper, useDataTable } from "@calcom/features/data-table";
import type { Watchlist } from "@calcom/lib/di/watchlist/types";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

interface SpamBlocklistTableProps {
  organizationId: number;
  onDelete: (entryId: string) => void;
  canEdit: boolean;
}

export default function SpamBlocklistTable(props: SpamBlocklistTableProps) {
  return (
    <DataTableProvider defaultPageSize={25}>
      <SpamBlocklistTableContent {...props} />
    </DataTableProvider>
  );
}

function SpamBlocklistTableContent({ organizationId, onDelete, canEdit }: SpamBlocklistTableProps) {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

  // Fetch spam blocklist data with pagination
  const { data, isPending } = trpc.viewer.organizations.listSpamBlocklist.useQuery({
    organizationId,
    limit,
    offset,
    searchTerm,
  });

  // Get user details for created by info
  const { data: members } = trpc.viewer.organizations.getMembers.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getMemberInfo = useCallback(
    (userId: number) => {
      if (!members || !Array.isArray(members)) {
        return {
          name: t("unknown_user"),
          email: "",
          avatarUrl: null,
          username: null,
        };
      }
      const member = members.find((m) => m.user.id === userId);
      if (!member) {
        return {
          name: t("unknown_user"),
          email: "",
          avatarUrl: null,
          username: null,
        };
      }

      const { user } = member;
      const memberName =
        user.name ||
        (() => {
          const emailName = user.email.split("@")[0];
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        })();

      return {
        name: memberName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        username: user.username,
      };
    },
    [members, t]
  );

  const columns = useMemo<ColumnDef<Watchlist>[]>(
    () => [
      {
        id: "value",
        header: `${t("email")} / ${t("domain")}`,
        accessorKey: "value",
        cell: ({ row }) => (
          <code className="bg-subtle rounded px-2 py-1 font-mono text-xs">{row.original.value}</code>
        ),
      },
      {
        id: "type",
        header: t("type"),
        accessorKey: "type",
        cell: ({ row }) => (
          <Badge variant={row.original.type === "EMAIL" ? "blue" : "green"}>
            {row.original.type === "EMAIL" ? t("email") : t("domain")}
          </Badge>
        ),
      },
      {
        id: "description",
        header: t("description"),
        accessorKey: "description",
        cell: ({ row }) => (
          <div className="max-w-xs truncate" title={row.original.description || ""}>
            {row.original.description || "-"}
          </div>
        ),
      },
      {
        id: "status",
        header: t("status"),
        cell: () => <Badge variant="red">{t("blocked")}</Badge>,
      },
      {
        id: "createdBy",
        header: t("blocked_by"),
        accessorKey: "createdById",
        cell: ({ row }) => {
          const memberInfo = getMemberInfo(row.original.createdById);
          return (
            <div className="flex items-center gap-2">
              <Avatar
                size="sm"
                alt={memberInfo.username || memberInfo.email}
                imageSrc={getUserAvatarUrl({
                  avatarUrl: memberInfo.avatarUrl,
                })}
              />
              <div className="">
                <div className="text-emphasis text-sm font-medium leading-none">{memberInfo.name}</div>
                <div className="text-subtle mt-1 text-sm leading-none">{memberInfo.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: t("date_added"),
        accessorKey: "createdAt",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: t("actions"),
              cell: ({ row }: { row: { original: Watchlist } }) => (
                <div className="flex justify-end">
                  <Button
                    variant="icon"
                    color="destructive"
                    StartIcon="trash-2"
                    onClick={() => onDelete(row.original.id)}
                    tooltip={t("delete_spam_entry")}
                  />
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, canEdit, onDelete, getMemberInfo]
  );

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.meta?.totalRowCount ?? 0) / limit),
  });

  return (
    <DataTableWrapper
      table={table}
      isPending={isPending}
      totalRowCount={data?.meta?.totalRowCount ?? 0}
      paginationMode="standard"
    />
  );
}
