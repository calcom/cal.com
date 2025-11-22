import { useState } from "react";
import posthog from "posthog-js";

import dayjs from "@calcom/dayjs";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast, showProgressToast, hideProgressToast } from "@calcom/ui/components/toast";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { extractDateRangeFromColumnFilters } from "../../lib/bookingUtils";

type RawData = RouterOutputs["viewer"]["insights"]["rawData"]["data"][number];

const BATCH_SIZE = 100;

const Download = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const { startDate, endDate } = extractDateRangeFromColumnFilters(insightsBookingParams.columnFilters);
  const [isDownloading, setIsDownloading] = useState(false);
  const utils = trpc.useUtils();

  type PaginatedResponse = {
    data: RawData[];
    total: number;
  };

  const fetchBatch = async (offset: number): Promise<PaginatedResponse | null> => {
    try {
      const result = await utils.viewer.insights.rawData.fetch({
        ...insightsBookingParams,
        limit: BATCH_SIZE,
        offset,
      });

      if (result && "data" in result && "total" in result) {
        return result as PaginatedResponse;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleDownloadClick = async () => {
    try {
      posthog.capture("insights_bookings_download_clicked", { teamId: insightsBookingParams.selectedTeamId });
      setIsDownloading(true);
      showProgressToast(0);
      let allData: RawData[] = [];
      let offset = 0;

      // Get first batch to get total count
      const firstBatch = await fetchBatch(0);
      if (!firstBatch) return;

      allData = firstBatch.data;
      const totalRecords = firstBatch.total;

      // Continue fetching remaining batches
      while (totalRecords > 0 && allData.length < totalRecords) {
        offset += BATCH_SIZE;
        const result = await fetchBatch(offset);
        if (!result) break;
        allData = [...allData, ...result.data];

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        showProgressToast(currentProgress);
      }

      if (allData.length >= totalRecords) {
        showProgressToast(100); // Set to 100% before actual download
        const filename = `Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format(
          "YYYY-MM-DD"
        )}.csv`;
        downloadAsCsv(allData as Record<string, unknown>[], filename);
      }
    } catch {
      showToast(t("unexpected_error_try_again"), "error");
    } finally {
      setIsDownloading(false);
      hideProgressToast(); // Reset progress
    }
  };

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          EndIcon="file-down"
          color="secondary"
          loading={isDownloading}
          className="h-full self-end sm:self-baseline">
          {t("download")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownItem onClick={handleDownloadClick}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export { Download };
