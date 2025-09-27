"use client";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { DataTableProvider, DataTableWrapper, DataTableToolbar } from "@calcom/features/data-table";
import { useDataTable } from "@calcom/features/data-table/hooks";
import { trpc } from "@calcom/trpc/react";

import { useOrganizationColumns, type OrganizationData } from "./columns";

export function AdminOrgTable() {
  return (
    <DataTableProvider defaultPageSize={25}>
      <AdminOrgTableContent />
    </DataTableProvider>
  );
}

function AdminOrgTableContent() {
  const { pageIndex, pageSize, searchTerm } = useDataTable();

  const { data, isLoading } = trpc.viewer.organizations.adminGetAll.useQuery({
    take: pageSize,
    skip: pageIndex * pageSize,
    orderBy: "createdAt",
    sortOrder: "desc",
    searchTerm,
  });

  const columns = useOrganizationColumns();

  const flatData = useMemo(() => data?.organizations ?? [], [data]) as OrganizationData[];

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalCount ? Math.ceil(data.totalCount / pageSize) : 0,
  });

  return (
    <DataTableWrapper<OrganizationData>
      table={table}
      isPending={isLoading}
      totalRowCount={data?.totalCount}
      paginationMode="standard"
      ToolbarLeft={<DataTableToolbar.SearchBar />}
    />
  );
}

export default AdminOrgTable;
