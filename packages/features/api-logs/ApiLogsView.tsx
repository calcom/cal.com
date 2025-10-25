"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";
import { Input, Select, DateRangePicker } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";

function ApiLogsView() {
  const router = useRouter();
  const { t } = useLocale();
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    perPage: 50,
    isError: undefined as boolean | undefined,
    endpoint: "",
    method: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    userId: undefined as number | undefined,
  });

  const { data: currentUser } = trpc.viewer.me.useQuery();
  const isAdmin = currentUser?.role === "ADMIN";
  const { data: users } = trpc.viewer.teams.list.useQuery(undefined, { enabled: isAdmin });

  const { data, isLoading } = trpc.viewer.apiLogs.list.useQuery(filters, {
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const exportToCSV = () => {
    if (!data?.data.length) return;
    setIsExporting(true);
    
    const headers = ["Timestamp", "Method", "Endpoint", "Status", "Response Time (ms)", "Error"];
    const rows = data.data.map(log => [
      new Date(log.timestamp).toISOString(),
      log.method,
      log.endpoint,
      log.statusCode,
      log.responseTime,
      log.errorMessage || ""
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const exportToJSON = () => {
    if (!data?.data.length) return;
    setIsExporting(true);
    
    const json = JSON.stringify(data.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "green";
    if (statusCode >= 400 && statusCode < 500) return "yellow";
    if (statusCode >= 500) return "red";
    return "gray";
  };

  const methodOptions = [
    { label: t("api_logs_all_methods"), value: "" },
    { label: "GET", value: "GET" },
    { label: "POST", value: "POST" },
    { label: "PUT", value: "PUT" },
    { label: "DELETE", value: "DELETE" },
    { label: "PATCH", value: "PATCH" },
  ];

  const statusOptions = [
    { label: t("api_logs_all_status"), value: "" },
    { label: t("api_logs_success"), value: "false" },
    { label: t("api_logs_error"), value: "true" },
  ];

  return (
    <SettingsHeader
      title={t("api_logs_title")}
      description={t("api_logs_description")}
      borderInShellHeader={true}
      CTA={
        <div className="flex items-center gap-2">
          {data?.data.length ? (
            <>
              <Button color="secondary" onClick={exportToCSV} disabled={isExporting}>
                {t("api_logs_export_csv")}
              </Button>
              <Button color="secondary" onClick={exportToJSON} disabled={isExporting}>
                {t("api_logs_export_json")}
              </Button>
            </>
          ) : null}
          <div className="text-subtle flex items-center gap-2 text-xs">
            <div className="bg-green-500 h-2 w-2 animate-pulse rounded-full" />
            Live
          </div>
        </div>
      }>
      <div className="border-subtle space-y-6 border-x px-4 py-6 sm:px-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              type="text"
              placeholder={t("api_logs_filter_endpoint")}
              value={filters.endpoint}
              onChange={(e) => setFilters({ ...filters, endpoint: e.target.value })}
              className="flex-1"
            />
            <Select
              options={methodOptions}
              value={methodOptions.find((opt) => opt.value === filters.method)}
              onChange={(option) => setFilters({ ...filters, method: option?.value || "" })}
              className="w-full sm:w-40"
            />
            <Select
              options={statusOptions}
              value={statusOptions.find(
                (opt) => opt.value === (filters.isError === undefined ? "" : filters.isError.toString())
              )}
              onChange={(option) =>
                setFilters({
                  ...filters,
                  isError: option?.value === "" ? undefined : option?.value === "true",
                })
              }
              className="w-full sm:w-40"
            />
            {isAdmin && (
              <Input
                type="number"
                placeholder={t("api_logs_filter_customer")}
                value={filters.userId || ""}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full sm:w-40"
              />
            )}
          </div>
          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onDatesChange={({ startDate, endDate }) => setFilters({ ...filters, startDate, endDate })}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        ) : !data?.data.length ? (
          <div className="border-subtle flex flex-col items-center justify-center rounded-md border p-12 text-center">
            <div className="bg-subtle mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <svg className="text-muted h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-emphasis mb-2 text-lg font-semibold">{t("no_api_logs_found")}</h3>
            <p className="text-subtle text-sm">{t("no_api_logs_description")}</p>
          </div>
        ) : (
          <>
            <div className="border-subtle overflow-hidden rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="border-subtle border-b px-4 py-3 text-left text-sm font-medium">
                      {t("api_logs_timestamp")}
                    </th>
                    <th className="border-subtle border-b px-4 py-3 text-left text-sm font-medium">
                      {t("api_logs_method")}
                    </th>
                    <th className="border-subtle border-b px-4 py-3 text-left text-sm font-medium">
                      {t("api_logs_endpoint")}
                    </th>
                    <th className="border-subtle border-b px-4 py-3 text-left text-sm font-medium">
                      {t("api_logs_status")}
                    </th>
                    <th className="border-subtle border-b px-4 py-3 text-left text-sm font-medium">
                      {t("api_logs_response_time")}
                    </th>
                    <th className="border-subtle border-b px-4 py-3 text-left text-sm font-medium">
                      {t("api_logs_actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((log) => (
                    <tr key={log.id} className="hover:bg-muted">
                      <td className="border-subtle border-b px-4 py-3 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="border-subtle border-b px-4 py-3">
                        <Badge variant="gray">{log.method}</Badge>
                      </td>
                      <td className="border-subtle border-b px-4 py-3 text-sm">{log.endpoint}</td>
                      <td className="border-subtle border-b px-4 py-3">
                        <Badge variant={getStatusColor(log.statusCode)}>{log.statusCode}</Badge>
                      </td>
                      <td className="border-subtle border-b px-4 py-3 text-sm">{log.responseTime}ms</td>
                      <td className="border-subtle border-b px-4 py-3">
                        <Button
                          color="secondary"
                          size="sm"
                          onClick={() => router.push(`/settings/developer/api-logs/${log.id}`)}>
                          {t("view")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.data.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-subtle text-sm">
                  {t("api_logs_showing_pages", {
                    page: data?.pagination.page,
                    totalPages: data?.pagination.totalPages,
                    total: data?.pagination.total,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    color="secondary"
                    disabled={filters.page === 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
                    {t("previous")}
                  </Button>
                  <Button
                    color="secondary"
                    disabled={filters.page === data?.pagination.totalPages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
                    {t("next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsHeader>
  );
}

export default ApiLogsView;
