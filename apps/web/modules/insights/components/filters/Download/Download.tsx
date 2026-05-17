import { extractDateRangeFromColumnFilters } from "@calcom/features/insights/lib/bookingUtils";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { hideProgressToast, showProgressToast, showToast } from "@calcom/ui/components/toast";
import posthog from "posthog-js";
import { useState } from "react";
import { useInsightsBookingParameters } from "../../../hooks/useInsightsBookingParameters";

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

  const fetchBatch = async (offset: number): Promise<PaginatedResponse> => {
    const result = await utils.viewer.insights.rawData.fetch({
      ...insightsBookingParams,
      limit: BATCH_SIZE,
      offset,
    });

    if (!result || !("data" in result) || !("total" in result)) {
      throw new Error("Unexpected response format from rawData");
    }
    return result as PaginatedResponse;
  };

  const handleDownloadClick = async () => {
    try {
      posthog.capture("insights_bookings_download_clicked", { teamId: insightsBookingParams.selectedTeamId });
      setIsDownloading(true);
      showProgressToast(0);

      const firstBatch = await fetchBatch(0);
      let allData: RawData[] = firstBatch.data;
      const totalRecords = firstBatch.total;

      let offset = BATCH_SIZE;
      while (allData.length < totalRecords) {
        const result = await fetchBatch(offset);
        if (result.data.length === 0) break;
        allData = [...allData, ...result.data];
        offset += BATCH_SIZE;

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        showProgressToast(currentProgress);
      }

      showProgressToast(100);
      const toDateStr = (d: string) => new Date(d).toISOString().slice(0, 10);
      const filename = `Insights-${toDateStr(startDate)}-${toDateStr(endDate)}.csv`;
      downloadAsCsv(allData as Record<string, unknown>[], filename);
    } catch {
      showToast(t("unexpected_error_try_again"), "error");
    } finally {
      setIsDownloading(false);
      hideProgressToast();
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
