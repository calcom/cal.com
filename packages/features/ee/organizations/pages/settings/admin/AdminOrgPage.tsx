"use client";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { DataTableProvider, DataTableWrapper } from "@calcom/features/data-table";
import { useDataTable } from "@calcom/features/data-table/hooks";
import { trpc } from "@calcom/trpc/react";

import { useOrganizationColumns } from "./columns";

export function AdminOrgTable() {
  return (
    <DataTableProvider defaultPageSize={25}>
      <AdminOrgTableContent />
    </DataTableProvider>
  );
}

function AdminOrgTableContent() {
  const { pageIndex, pageSize } = useDataTable();

  const { data, isLoading } = trpc.viewer.organizations.adminGetAll.useQuery({
    take: pageSize,
    skip: pageIndex * pageSize,
    orderBy: "createdAt",
    sortOrder: "desc",
  });

  const columns = useOrganizationColumns();

  const table = useReactTable({
    data: data?.organizations ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalCount ? Math.ceil(data.totalCount / pageSize) : 0,
  });

  return (
    <DataTableWrapper
      table={table}
      isPending={isLoading}
      totalRowCount={data?.totalCount}
      paginationMode="standard"
    />
  );
}

export default AdminOrgTable;
