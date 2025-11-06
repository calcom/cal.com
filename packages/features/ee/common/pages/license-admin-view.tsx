"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  DataTableFilters,
  ColumnFilterType,
  useDataTable,
} from "@calcom/features/data-table";
import { DeploymentDetailsSheet } from "@calcom/features/ee/common/components/DeploymentDetailsSheet";
import type { Deployment, LicenseKey } from "@calcom/features/ee/common/server/types/admin";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { PanelCard } from "@calcom/ui/components/card";

type DeploymentTableData = Deployment & {
  liveKey?: LicenseKey;
  testKey?: LicenseKey;
};

const DeploymentsTable = ({ onRowClick }: { onRowClick: (deployment: DeploymentTableData) => void }) => {
  const { limit, offset, searchTerm } = useDataTable();

  const { data, isPending } = trpc.viewer.admin.license.listDeployments.useQuery(
    {
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      ...(searchTerm && { billingEmail: searchTerm }),
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const flatData = useMemo<DeploymentTableData[]>(() => {
    if (!data?.data) return [];
    return data.data.map((deployment) => {
      const liveKey = deployment.keys.find((k) => k.keyVariant === "LIVE");
      const testKey = deployment.keys.find((k) => k.keyVariant === "TEST");
      return {
        ...deployment,
        liveKey,
        testKey,
      };
    });
  }, [data]);

  const columns = useMemo<ColumnDef<DeploymentTableData>[]>(
    () => [
      {
        id: "billingEmail",
        header: "Billing Email",
        accessorKey: "billingEmail",
        cell: ({ row }) => {
          const email = row.original.billingEmail;
          return <div className="text-sm">{email || <span className="text-muted">—</span>}</div>;
        },
        meta: {
          type: ColumnFilterType.TEXT,
          textOptions: {
            placeholder: "Search by email...",
          },
        },
      },
      {
        id: "customerId",
        header: "Customer ID",
        accessorKey: "customerId",
        cell: ({ row }) => {
          const customerId = row.original.customerId;
          return (
            <div className="font-mono text-sm">{customerId || <span className="text-muted">—</span>}</div>
          );
        },
        meta: {
          type: ColumnFilterType.TEXT,
        },
      },
      {
        id: "keys",
        header: "Keys",
        cell: ({ row }) => {
          const { liveKey, testKey } = row.original;
          return (
            <div className="flex gap-2">
              {liveKey && (
                <Badge variant={liveKey.active ? "green" : "gray"} className="text-xs">
                  LIVE {liveKey.active ? "✓" : "✗"}
                </Badge>
              )}
              {testKey && (
                <Badge variant={testKey.active ? "blue" : "gray"} className="text-xs">
                  TEST {testKey.active ? "✓" : "✗"}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "usageLimits",
        header: "Usage Limits",
        cell: ({ row }) => {
          const liveKey = row.original.liveKey;
          const limits = liveKey?.usageLimits;
          if (!limits) return <span className="text-muted">—</span>;
          return (
            <div className="text-sm">
              <div>
                {limits.billingType}: {limits.entityCount}
              </div>
              {limits.overages > 0 && (
                <div className="text-muted text-xs">Overages: ${limits.overages / 100}</div>
              )}
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ row }) => {
          const date = row.original.createdAt;
          return <div className="text-sm">{dayjs(date).format("MMM D, YYYY")}</div>;
        },
        meta: {
          type: ColumnFilterType.DATE_RANGE,
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data?.pagination.totalPages ?? 0,
  });

  return (
    <DataTableWrapper
      table={table}
      isPending={isPending}
      totalRowCount={data?.pagination.total ?? 0}
      paginationMode="standard"
      ToolbarLeft={
        <>
          <DataTableToolbar.SearchBar />
          <DataTableFilters.FilterBar table={table} />
        </>
      }
      ToolbarRight={<DataTableFilters.ClearFiltersButton />}
      onRowMouseclick={(row) => onRowClick(row.original)}
    />
  );
};

export const LicenseAdminView = () => {
  const pathname = usePathname();
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentTableData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!pathname) return null;

  const handleRowClick = (deployment: DeploymentTableData) => {
    setSelectedDeployment(deployment);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <PanelCard title="Deployments" collapsible defaultCollapsed={false}>
          <DataTableProvider tableIdentifier={pathname} defaultPageSize={20}>
            <DeploymentsTable onRowClick={handleRowClick} />
          </DataTableProvider>
        </PanelCard>
      </div>
      {selectedDeployment && (
        <DeploymentDetailsSheet
          deployment={selectedDeployment}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  );
};
