"use client";

import { DataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DateRangePicker } from "@calcom/ui/components/form/date-range-picker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
  SheetDescription,
} from "@calcom/ui/components/sheet";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

type Deployment =
  RouterOutputs["viewer"]["admin"]["selfHosted"]["listDeployments"]["data"][number];
type DeploymentKey =
  RouterOutputs["viewer"]["admin"]["selfHosted"]["getDeploymentKeys"]["data"][number];

interface DeploymentDetailsSheetProps {
  deployment: Deployment;
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentDetailsSheet({
  deployment,
  isOpen,
  onClose,
}: DeploymentDetailsSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  // Date range for usage - default to last 30 days
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
  });

  // Fetch keys
  const { data: keysData, isLoading: keysLoading } =
    trpc.viewer.admin.selfHosted.getDeploymentKeys.useQuery(
      { deploymentId: deployment.id },
      { enabled: isOpen }
    );

  // Fetch usage
  const { data: usageData, isLoading: usageLoading } =
    trpc.viewer.admin.selfHosted.getDeploymentUsage.useQuery(
      {
        deploymentId: deployment.id,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
      { enabled: isOpen }
    );

  // Regenerate signature mutation
  const regenerateMutation =
    trpc.viewer.admin.selfHosted.regenerateSignature.useMutation({
      onSuccess: (data) => {
        showToast(data.data.message, "success");
        // Copy new signature to clipboard
        navigator.clipboard.writeText(data.data.signature);
        showToast(t("signature_copied_to_clipboard"), "success");
        utils.viewer.admin.selfHosted.getDeploymentKeys.invalidate({
          deploymentId: deployment.id,
        });
      },
      onError: (error) => {
        showToast(error.message, "error");
      },
    });

  const keyColumns = useMemo<ColumnDef<DeploymentKey>[]>(
    () => [
      {
        id: "keyVariant",
        accessorKey: "keyVariant",
        header: t("type"),
        size: 80,
        cell: ({ row }) => (
          <Badge
            variant={row.original.keyVariant === "LIVE" ? "green" : "orange"}
          >
            {row.original.keyVariant}
          </Badge>
        ),
      },
      {
        id: "key",
        accessorKey: "key",
        header: t("license_key"),
        size: 200,
        cell: ({ row }) => (
          <code className="text-subtle rounded bg-subtle px-1.5 py-0.5 text-xs">
            {row.original.key.slice(0, 12)}...
          </code>
        ),
      },
      {
        id: "active",
        accessorKey: "active",
        header: t("status"),
        size: 80,
        cell: ({ row }) => (
          <Badge variant={row.original.active ? "green" : "red"}>
            {row.original.active ? t("active") : t("inactive")}
          </Badge>
        ),
      },
      {
        id: "billingType",
        accessorKey: "usageLimits.billingType",
        header: t("billing_type"),
        size: 120,
        cell: ({ row }) => (
          <span className="text-subtle text-sm">
            {row.original.usageLimits?.billingType || t("not_set")}
          </span>
        ),
      },
      {
        id: "lastPolled",
        accessorKey: "lastPolledDate",
        header: t("last_polled"),
        size: 150,
        cell: ({ row }) => {
          if (!row.original.lastPolledDate)
            return <span className="text-subtle text-sm">{t("never")}</span>;
          const date = new Date(row.original.lastPolledDate);
          return (
            <span className="text-subtle text-sm">
              {date.toLocaleDateString()} {date.toLocaleTimeString()}
            </span>
          );
        },
      },
    ],
    [t]
  );

  const keysTable = useReactTable({
    data: keysData?.data ?? [],
    columns: keyColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  // Calculate total usage
  const totalUsage = useMemo(() => {
    if (!usageData?.data) return 0;
    return usageData.data.reduce((sum, record) => sum + record.count, 0);
  }, [usageData?.data]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("deployment_details")}</SheetTitle>
          <SheetDescription>
            {deployment.billingEmail || deployment.id}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {/* Deployment Info */}
          <div className="space-y-4">
            <h3 className="text-emphasis text-sm font-semibold">
              {t("deployment_info")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-subtle text-xs">{t("deployment_id")}</p>
                <code className="text-default text-sm">{deployment.id}</code>
              </div>
              <div>
                <p className="text-subtle text-xs">{t("billing_email")}</p>
                <p className="text-default text-sm">
                  {deployment.billingEmail || t("not_set")}
                </p>
              </div>
              <div>
                <p className="text-subtle text-xs">{t("customer_id")}</p>
                <p className="text-default text-sm">
                  {deployment.customerId || t("not_set")}
                </p>
              </div>
              <div>
                <p className="text-subtle text-xs">{t("created")}</p>
                <p className="text-default text-sm">
                  {new Date(deployment.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* License Keys */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-emphasis text-sm font-semibold">
                {t("license_keys")}
              </h3>
              <Badge variant="gray">
                {keysData?.meta.total || 0} {t("keys")}
              </Badge>
            </div>
            {keysLoading ? (
              <div className="space-y-2">
                <SkeletonText className="h-10 w-full" />
                <SkeletonText className="h-10 w-full" />
              </div>
            ) : (
              <div className="border-subtle rounded-lg border">
                <DataTable table={keysTable} isPending={keysLoading} />
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-emphasis text-sm font-semibold">
                {t("usage")}
              </h3>
              <DateRangePicker
                dates={{
                  startDate: dateRange.startDate,
                  endDate: dateRange.endDate,
                }}
                onDatesChange={({ startDate, endDate }) => {
                  if (startDate && endDate) {
                    setDateRange({ startDate, endDate });
                  }
                }}
              />
            </div>
            {usageLoading ? (
              <SkeletonText className="h-20 w-full" />
            ) : (
              <div className="bg-subtle rounded-lg p-4">
                <div className="text-center">
                  <p className="text-emphasis text-3xl font-bold">
                    {totalUsage.toLocaleString()}
                  </p>
                  <p className="text-subtle text-sm">
                    {t("total_events_in_period")}
                  </p>
                </div>
                {usageData?.data && usageData.data.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-subtle text-xs font-medium">
                      {t("usage_by_key")}
                    </p>
                    {usageData.data.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <code className="text-subtle text-xs">
                          {record.Key.key.slice(0, 12)}... (
                          {record.Key.keyVariant})
                        </code>
                        <Badge variant="gray">{record.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          <Button
            color="destructive"
            onClick={() =>
              regenerateMutation.mutate({ deploymentId: deployment.id })
            }
            loading={regenerateMutation.isPending}
            disabled={regenerateMutation.isPending}
          >
            {t("regenerate_signature_token")}
          </Button>
          <Button color="secondary" onClick={onClose}>
            {t("close")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
