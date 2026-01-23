import dayjs from "@calcom/dayjs";
import type { SortingState } from "@calcom/features/data-table";
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
import { showToast } from "@calcom/ui/components/toast";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import { useState } from "react";

import { hideProgressToast, showProgressToast } from "@lib/progress-toast";

type RoutingData = RouterOutputs["viewer"]["insights"]["routingFormResponsesForDownload"]["data"][number];

type Props = {
  sorting: SortingState;
};

const BATCH_SIZE = 100; // Increased batch size for downloads

export const RoutingFormResponsesDownload = ({ sorting }: Props) => {
  const { t } = useLocale();
  const [isDownloading, setIsDownloading] = useState(false);
  const insightsRoutingParameters = useInsightsRoutingParameters();
  const { startDate, endDate } = insightsRoutingParameters;

  const utils = trpc.useUtils();

  const fetchBatch = async (
    offset: number
  ): Promise<{
    data: RoutingData[];
    total: number;
  }> => {
    const result = await utils.viewer.insights.routingFormResponsesForDownload.fetch({
      ...insightsRoutingParameters,
      sorting,
      limit: BATCH_SIZE,
      offset,
    });
    return result;
  };

  const handleDownloadClick = async () => {
    const abortController = new AbortController();
    const { signal } = abortController;

    try {
      setIsDownloading(true);
      showProgressToast(0, undefined, undefined, abortController);
      let allData: RoutingData[] = [];
      let offset = 0;

      const firstBatch = await fetchBatch(0);
      if (signal.aborted) return;

      allData = [...firstBatch.data];
      const totalRecords = firstBatch.total;

      while (totalRecords > 0 && allData.length < totalRecords && !signal.aborted) {
        offset += BATCH_SIZE;
        const result = await fetchBatch(offset);
        if (signal.aborted) break;
        allData = [...allData, ...result.data];

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        showProgressToast(currentProgress);
      }

      if (signal.aborted) return;

      if (allData.length >= totalRecords) {
        showProgressToast(100);
        const filename = `RoutingFormResponses-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(
          endDate
        ).format("YYYY-MM-DD")}.csv`;
        downloadAsCsv(allData as Record<string, unknown>[], filename);
      }
    } catch (error) {
      showToast(t("error_downloading_data"), "error");
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
          className="self-end sm:self-baseline"
          loading={isDownloading}>
          {t("download")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownItem onClick={handleDownloadClick}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};
