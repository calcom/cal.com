"use client";

import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import { Group, GroupSeparator, GroupText } from "@coss/ui/components/group";
import { Spinner } from "@coss/ui/components/spinner";
import { toastManager } from "@coss/ui/components/toast";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@coss/ui/components/tooltip";
import { DownloadIcon, XIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface PaginatedResponse<TData> {
  data: TData[];
  total: number;
}

interface CsvDownloadButtonProps<TData, TTransformed = TData> {
  fetchBatch: (offset: number) => Promise<PaginatedResponse<TData> | null>;
  transformData?: (data: TData[]) => TTransformed[];
  filename: string | (() => string);
  onDownloadStart?: () => void;
}

export function CsvDownloadButton<TData, TTransformed = TData>({
  fetchBatch,
  transformData,
  filename,
  onDownloadStart,
}: CsvDownloadButtonProps<TData, TTransformed>) {
  const { t } = useLocale();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const infoToastIdRef = useRef<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;

    onDownloadStart?.();
    setIsDownloading(true);
    setProgress(0);
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    infoToastIdRef.current = toastManager.add({
      title: t("downloading"),
      type: "info",
    });

    try {
      const firstBatch = await fetchBatch(0);
      if (!firstBatch || signal.aborted) return;

      let allData = firstBatch.data;
      const totalRecords = firstBatch.total;

      while (totalRecords > 0 && allData.length < totalRecords && !signal.aborted) {
        const batch = await fetchBatch(allData.length);
        if (!batch || signal.aborted) break;
        allData = [...allData, ...batch.data];

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        setProgress(currentProgress);
      }

      if (signal.aborted) return;

      setProgress(100);

      if (infoToastIdRef.current) {
        toastManager.close(infoToastIdRef.current);
        infoToastIdRef.current = null;
      }

      const csvData = transformData ? transformData(allData) : allData;
      const resolvedFilename = typeof filename === "function" ? filename() : filename;
      downloadAsCsv(csvData as Record<string, unknown>[], resolvedFilename);
    } catch (err) {
      if (infoToastIdRef.current) {
        toastManager.close(infoToastIdRef.current);
        infoToastIdRef.current = null;
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        toastManager.add({
          title: t("cancelled"),
          type: "error",
        });
      } else {
        toastManager.add({
          title: t("failed_to_download"),
          type: "error",
        });
      }
    } finally {
      setIsDownloading(false);
      setProgress(0);
      abortControllerRef.current = null;
      infoToastIdRef.current = null;
    }
  }, [isDownloading, fetchBatch, transformData, filename, onDownloadStart, t]);

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  return (
    <TooltipProvider delay={0}>
      {isDownloading ? (
        <Group>
          <GroupText aria-live="polite" className="cursor-default gap-2" role="status">
            <Spinner />
            <span aria-hidden="true" className="font-medium text-foreground tabular-nums">
              {progress.toString().padStart(2, "\u2007")}%
            </span>
            <span className="sr-only">
              {t("downloading")}, {t("download_progress", { progress })}
            </span>
          </GroupText>
          <GroupSeparator />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={t("cancel_download")}
                  onClick={handleCancel}
                  size="icon"
                  variant="outline"
                />
              }>
              <XIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipPopup>{t("cancel")}</TooltipPopup>
          </Tooltip>
        </Group>
      ) : (
        <Button onClick={handleDownload} variant="outline">
          <DownloadIcon aria-hidden="true" />
          {t("download")}
        </Button>
      )}
    </TooltipProvider>
  );
}
