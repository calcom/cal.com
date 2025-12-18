"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import {
  ColumnFilterType,
  DataTableFilters,
  DataTableProvider,
  DataTableToolbar,
  DataTableWrapper,
  useColumnFilters,
  useDataTable,
  convertFacetedValuesToMap,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

type AdminTeamRow = RouterOutputs["viewer"]["admin"]["listTeams"]["rows"][number];

export function AdminTeamsTable() {
  const pathname = usePathname();
  if (!pathname) return null;

  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} defaultPageSize={25}>
      <AdminTeamsTableContent />
    </DataTableProvider>
  );
}

function AdminTeamsTableContent() {
  const { t } = useLocale();

  const { limit, offset, searchTerm, sorting } = useDataTable();
  const columnFilters = useColumnFilters();

  const { data, isPending } = trpc.viewer.admin.listTeams.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: columnFilters,
      sorting,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const rows = useMemo<AdminTeamRow[]>(() => data?.rows ?? [], [data?.rows]);

  const columns = useMemo<ColumnDef<AdminTeamRow>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
        size: 90,
        meta: {
          filter: { type: ColumnFilterType.NUMBER },
        },
        cell: ({ row }) => <code className="text-xs">{row.original.id}</code>,
      },
      {
        id: "name",
        accessorKey: "name",
        header: t("team"),
        size: 220,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <div className="text-emphasis text-sm font-medium leading-none">{row.original.name}</div>
            <div className="text-subtle mt-1 text-sm leading-none">{row.original.slug ?? "-"}</div>
          </div>
        ),
      },
      {
        id: "slug",
        accessorKey: "slug",
        header: t("slug"),
        size: 180,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => <span className="text-sm">{row.original.slug ?? "-"}</span>,
      },
      {
        id: "kind",
        accessorFn: (row) => (row.isOrganization ? "organization" : "team"),
        header: t("type"),
        enableSorting: false,
        size: 140,
        meta: {
          filter: { type: ColumnFilterType.MULTI_SELECT },
        },
        cell: ({ row }) => (
          <Badge variant={row.original.isOrganization ? "blue" : "gray"}>
            {row.original.isOrganization ? t("organization") : t("team")}
          </Badge>
        ),
      },
      {
        id: "organization",
        accessorFn: (row) => row.organization?.name ?? "",
        header: t("organization"),
        enableSorting: false,
        size: 220,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => {
          const org = row.original.organization;
          if (!org) return <span className="text-subtle text-sm">-</span>;
          return (
            <div className="flex flex-col">
              <div className="text-emphasis text-sm font-medium leading-none">{org.name}</div>
              <div className="text-subtle mt-1 text-sm leading-none">{org.slug ?? "-"}</div>
            </div>
          );
        },
      },
      {
        id: "owner",
        accessorFn: (row) => row.owner?.email ?? "",
        header: t("owner"),
        enableSorting: false,
        size: 220,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => {
          const owner = row.original.owner;
          if (!owner) return <span className="text-subtle text-sm">-</span>;
          return (
            <div className="flex flex-col">
              <div className="text-emphasis text-sm font-medium leading-none">{owner.email}</div>
              <div className="text-subtle mt-1 text-sm leading-none">
                {owner.username ? `@${owner.username}` : owner.name ?? "-"}
              </div>
            </div>
          );
        },
      },
      {
        id: "subscriptionId",
        accessorKey: "subscriptionId",
        header: t("subscription_id"),
        enableSorting: false,
        size: 220,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => <code className="text-xs">{row.original.subscriptionId ?? "-"}</code>,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: t("created"),
        size: 160,
        cell: ({ row }) => <span className="text-sm">{new Date(row.original.createdAt).toLocaleString()}</span>,
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => `${row.id}`,
    getFacetedUniqueValues: (_, columnId) => () => {
      if (columnId === "kind") {
        return convertFacetedValuesToMap([
          { label: t("team"), value: "team" },
          { label: t("organization"), value: "organization" },
        ]);
      }
      return new Map();
    },
  });

  return (
    <DataTableWrapper<AdminTeamRow>
      testId="admin-teams-data-table"
      table={table}
      isPending={isPending}
      totalRowCount={data?.meta?.totalRowCount ?? 0}
      paginationMode="standard"
      ToolbarLeft={
        <>
          <DataTableToolbar.SearchBar />
          <DataTableFilters.ColumnVisibilityButton table={table} />
          <DataTableFilters.FilterBar table={table} />
        </>
      }
      ToolbarRight={
        <>
          <DataTableFilters.ClearFiltersButton />
        </>
      }
    />
  );
}

