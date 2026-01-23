"use client";

import { useCallback, useState } from "react";

import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { showToast } from "@calcom/ui/components/toast";

import { hideProgressToast, showProgressToast } from "@lib/progress-toast";

interface PaginatedResponse<TData> {
  data: TData[];
  total: number;
}

interface UseCsvDownloadOptions<TData, TTransformed> {
  /** Function to fetch a batch of data given an offset. Consumer normalizes response to { data, total } */
  fetchBatch: (offset: number) => Promise<PaginatedResponse<TData> | null>;
  /** Optional function to transform each data item before CSV export */
  transform?: (item: TData) => TTransformed;
  /** Function to generate the filename */
  getFilename: () => string;
  /** Error message to show on failure (should be already translated) */
  errorMessage: string;
  /** Optional callback before download starts (e.g., for analytics) */
  onDownloadStart?: () => void;
}

interface UseCsvDownloadReturn {
  isDownloading: boolean;
  handleDownload: () => Promise<void>;
}

export function useCsvDownload<TData, TTransformed = TData>({
  fetchBatch,
  transform,
  getFilename,
  errorMessage,
  onDownloadStart,
}: UseCsvDownloadOptions<TData, TTransformed>): UseCsvDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    try {
      onDownloadStart?.();
      setIsDownloading(true);
      showProgressToast(0, undefined, undefined, abortController);

      const firstBatch = await fetchBatch(0);
      if (!firstBatch || signal.aborted) return;

      let allData = firstBatch.data;
      const totalRecords = firstBatch.total;

      while (totalRecords > 0 && allData.length < totalRecords && !signal.aborted) {
        const batch = await fetchBatch(allData.length);
        if (!batch || signal.aborted) break;
        allData = [...allData, ...batch.data];

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        showProgressToast(currentProgress);
      }

      if (signal.aborted) return;

      showProgressToast(100);

      const csvData = transform ? allData.map(transform) : allData;
      downloadAsCsv(csvData as Record<string, unknown>[], getFilename());
    } catch {
      showToast(errorMessage, "error");
    } finally {
      setIsDownloading(false);
      hideProgressToast();
    }
  }, [fetchBatch, transform, getFilename, errorMessage, onDownloadStart]);

  return { isDownloading, handleDownload };
}
