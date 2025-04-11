import { useState } from "react";

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
import { showToast } from "@calcom/ui/components/toast";

import { useInsightsParameters } from "../../hooks/useInsightsParameters";

type RawData = RouterOutputs["viewer"]["insights"]["rawData"]["data"][number];

const BATCH_SIZE = 100;

const Download = () => {
  const { t } = useLocale();
  const { startDate, endDate, teamId, userId, eventTypeId, memberUserId, isAll } = useInsightsParameters();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const utils = trpc.useUtils();

  const fetchBatch = async (offset: number) => {
    return await utils.viewer.insights.rawData.fetch({
      startDate,
      endDate,
      teamId,
      userId,
      eventTypeId,
      memberUserId,
      isAll,
      limit: BATCH_SIZE,
      offset,
    });
  };

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0); // Reset progress
      let allData: RawData[] = [];
      let offset = 0;

      // Get first batch to get total count
      const firstBatch = await fetchBatch(0);
      allData = [...firstBatch.data];
      const totalRecords = firstBatch.total;

      // Continue fetching remaining batches
      while (totalRecords > 0 && allData.length < totalRecords) {
        offset += BATCH_SIZE;
        const result = await fetchBatch(offset);
        allData = [...allData, ...result.data];

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        setDownloadProgress(currentProgress);
      }

      if (allData.length >= totalRecords) {
        setDownloadProgress(100); // Set to 100% before actual download
        const filename = `Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format(
          "YYYY-MM-DD"
        )}.csv`;
        downloadAsCsv(allData as Record<string, unknown>[], filename);
      }
    } catch (error) {
      showToast(t("unexpected_error_try_again"), "error");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0); // Reset progress
    }
  };

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          EndIcon="file-down"
          color="secondary"
          loading={isDownloading}
          tooltip={isDownloading ? `${Math.floor(downloadProgress)}%` : undefined}
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
