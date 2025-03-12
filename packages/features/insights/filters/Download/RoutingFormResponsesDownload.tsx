import { useState } from "react";

import dayjs from "@calcom/dayjs";
import type { SortingState } from "@calcom/features/data-table";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger } from "@calcom/ui";
import { showToast } from "@calcom/ui";

import { useInsightsParameters } from "../../hooks/useInsightsParameters";

type RoutingData = RouterOutputs["viewer"]["insights"]["routingFormResponsesForDownload"]["data"][number];

type Props = {
  sorting: SortingState;
};

const BATCH_SIZE = 100; // Increased batch size for downloads

export const RoutingFormResponsesDownload = ({ sorting }: Props) => {
  const { t } = useLocale();
  const { teamId, userId, memberUserIds, routingFormId, isAll, startDate, endDate, columnFilters } =
    useInsightsParameters();
  const [isDownloading, setIsDownloading] = useState(false);

  const utils = trpc.useUtils();

  const fetchBatch = async (
    offset: number
  ): Promise<{
    data: RoutingData[];
    total: number;
  }> => {
    const result = await utils.viewer.insights.routingFormResponsesForDownload.fetch({
      teamId,
      startDate,
      endDate,
      userId,
      memberUserIds,
      isAll: isAll,
      routingFormId,
      columnFilters,
      sorting,
      limit: BATCH_SIZE,
      offset,
    });
    return result;
  };

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      let allData: RoutingData[] = [];
      let offset = 0;

      // Get first batch to get total count
      const firstBatch = await fetchBatch(0);
      allData = [...firstBatch.data];
      const totalRecords = firstBatch.total;

      // Continue fetching remaining batches
      while (allData.length < totalRecords) {
        offset += BATCH_SIZE;
        const result = await fetchBatch(offset);
        allData = [...allData, ...result.data];
      }

      if (allData.length > 0) {
        const filename = `RoutingFormResponses-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(
          endDate
        ).format("YYYY-MM-DD")}.csv`;
        downloadAsCsv(allData as Record<string, unknown>[], filename);
      }
    } catch (error) {
      showToast(t("error_downloading_data"), "error");
    } finally {
      setIsDownloading(false);
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
