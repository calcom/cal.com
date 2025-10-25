"use client";

import { useRouter } from "next/navigation";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export default function ApiLogDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const { data: log, isLoading } = trpc.viewer.apiLogs.detail.useQuery({ id }, { enabled: !!id });

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "green";
    if (statusCode >= 400 && statusCode < 500) return "yellow";
    if (statusCode >= 500) return "red";
    return "gray";
  };

  return (
    <SettingsHeader
      title={t("api_logs_detail_title")}
      description={t("api_logs_description")}
      borderInShellHeader={true}>
      <div className="border-subtle space-y-6 border-x px-4 py-6 sm:px-6">
        <Button color="secondary" onClick={() => router.back()}>
          {t("back")}
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        ) : log ? (
          <>
            <div className="border-subtle rounded-md border p-4">
              <h3 className="text-emphasis mb-4 text-lg font-semibold">
                {t("api_logs_request_info")}
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Badge variant="gray">{log.method}</Badge>
                  <Badge variant={getStatusColor(log.statusCode)}>{log.statusCode}</Badge>
                </div>
                <p className="text-sm">
                  <span className="text-subtle">{t("api_logs_endpoint")}:</span> {log.endpoint}
                </p>
                <p className="text-sm">
                  <span className="text-subtle">{t("api_logs_response_time")}:</span> {log.responseTime}ms
                </p>
                <p className="text-sm">
                  <span className="text-subtle">{t("api_logs_timestamp")}:</span>{" "}
                  {new Date(log.timestamp).toLocaleString()}
                </p>
                <p className="text-sm">
                  <span className="text-subtle">{t("api_logs_request_id")}:</span> {log.requestId}
                </p>
              </div>
            </div>

            {log.queryParams && Object.keys(log.queryParams).length > 0 && (
              <div className="border-subtle rounded-md border p-4">
                <h3 className="text-emphasis mb-4 text-lg font-semibold">
                  {t("api_logs_query_params")}
                </h3>
                <pre className="bg-muted overflow-auto rounded p-2 text-sm">
                  {JSON.stringify(log.queryParams, null, 2)}
                </pre>
              </div>
            )}

            {log.requestHeaders && (
              <div className="border-subtle rounded-md border p-4">
                <h3 className="text-emphasis mb-4 text-lg font-semibold">
                  {t("api_logs_request_headers")}
                </h3>
                <pre className="bg-muted overflow-auto rounded p-2 text-sm">
                  {JSON.stringify(log.requestHeaders, null, 2)}
                </pre>
              </div>
            )}

            {log.requestBody && (
              <div className="border-subtle rounded-md border p-4">
                <h3 className="text-emphasis mb-4 text-lg font-semibold">
                  {t("api_logs_request_body")}
                </h3>
                <pre className="bg-muted overflow-auto rounded p-2 text-sm">
                  {JSON.stringify(log.requestBody, null, 2)}
                </pre>
              </div>
            )}

            {log.responseBody && (
              <div className="border-subtle rounded-md border p-4">
                <h3 className="text-emphasis mb-4 text-lg font-semibold">
                  {t("api_logs_response_body")}
                </h3>
                <pre className="bg-muted overflow-auto rounded p-2 text-sm">
                  {JSON.stringify(log.responseBody, null, 2)}
                </pre>
              </div>
            )}

            {log.isError && (
              <div className="border-subtle rounded-md border border-red-200 bg-red-50 p-4">
                <h3 className="text-emphasis mb-4 text-lg font-semibold text-red-700">
                  {t("api_logs_error_details")}
                </h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-subtle font-semibold">{t("api_logs_error_message")}:</span>{" "}
                    {log.errorMessage}
                  </p>
                  {log.errorStack && (
                    <div>
                      <p className="text-subtle mb-2 text-sm font-semibold">
                        {t("api_logs_stack_trace")}:
                      </p>
                      <pre className="bg-muted overflow-auto rounded p-2 text-xs">
                        {log.errorStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-subtle">{t("not_found")}</p>
        )}
      </div>
    </SettingsHeader>
  );
}
