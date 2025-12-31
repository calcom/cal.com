"use client";

import { DeploymentDetailsSheet } from "./deployment-details-sheet";
import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  useDataTable,
} from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { PanelCard } from "@calcom/ui/components/card";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type Deployment =
  RouterOutputs["viewer"]["admin"]["selfHosted"]["listDeployments"]["data"][number];

function SelfHostedContent() {
  const { t } = useLocale();
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);

  const { limit, offset, searchTerm } = useDataTable();

  const { data, isPending } =
    trpc.viewer.admin.selfHosted.listDeployments.useQuery({
      page: Math.floor(offset / limit) + 1,
      limit,
      billingEmail: searchTerm || undefined,
    });

  const deployments = useMemo(() => data?.data ?? [], [data?.data]);

  const columns = useMemo<ColumnDef<Deployment>[]>(
    () => [
      {
        id: "billingEmail",
        accessorKey: "billingEmail",
        header: t("billing_email"),
        size: 250,
        cell: ({ row }) => (
          <span className="text-default font-medium">
            {row.original.billingEmail || t("not_set")}
          </span>
        ),
      },
      {
        id: "customerId",
        accessorKey: "customerId",
        header: t("customer_id"),
        size: 200,
        cell: ({ row }) => (
          <span className="text-subtle text-sm">
            {row.original.customerId || t("not_set")}
          </span>
        ),
      },
      {
        id: "keysCount",
        accessorKey: "_count.keys",
        header: t("keys"),
        size: 80,
        cell: ({ row }) => (
          <Badge variant="gray" className="font-mono">
            {row.original._count.keys}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: t("created"),
        size: 150,
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return (
            <div className="text-sm">
              <div className="text-default">{date.toLocaleDateString()}</div>
              <div className="text-subtle text-xs">
                {date.toLocaleTimeString()}
              </div>
            </div>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: deployments,
    columns,
    enableRowSelection: false,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <>
      <PanelCard title={t("self_hosted_deployments")}>
        <DataTableWrapper<Deployment>
          testId="self-hosted-deployments-table"
          table={table}
          isPending={isPending}
          totalRowCount={data?.meta.total || 0}
          paginationMode="standard"
          rowClassName="cursor-pointer hover:bg-subtle"
          onRowMouseclick={(row) => {
            setSelectedDeployment(row.original);
          }}
          ToolbarLeft={
            <DataTableToolbar.SearchBar placeholder={t("search_by_email")} />
          }
          EmptyView={
            <EmptyScreen
              Icon="server"
              headline={
                searchTerm
                  ? t("no_result_found_for", { searchTerm })
                  : t("no_deployments")
              }
              description={t("no_deployments_description")}
              className="mb-16"
            />
          }
        />
      </PanelCard>

      {selectedDeployment && (
        <DeploymentDetailsSheet
          deployment={selectedDeployment}
          isOpen={!!selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}
    </>
  );
}

export default function SelfHostedView() {
  const pathname = usePathname();
  if (!pathname) return null;

  return (
    <DataTableProvider tableIdentifier={pathname} defaultPageSize={20}>
      <SelfHostedContent />
    </DataTableProvider>
  );
}
