import { useState } from "react";

import { useFilterContext } from "@calcom/features/insights/context/provider";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger } from "@calcom/ui";
import { showToast } from "@calcom/ui";

type RawRoutingData = RouterOutputs["viewer"]["insights"]["rawRoutingData"]["data"][number] | undefined;

interface BatchResult {
  data: RawRoutingData[];
  nextCursor: number | null;
  hasMore: boolean;
}

const RoutingDownload = () => {
  const { filter } = useFilterContext();
  const { t } = useLocale();
  const [isDownloading, setIsDownloading] = useState(false);

  const utils = trpc.useUtils();

  const fetchBatch = async (cursor: number | null = null) => {
    const result = await utils.viewer.insights.rawRoutingData.fetch({
      startDate: filter.dateRange[0].toISOString(),
      endDate: filter.dateRange[1].toISOString(),
      teamId: filter.selectedTeamId ?? undefined,
      userId: filter.selectedUserId ?? undefined,
      memberUserId: filter.selectedMemberUserId ?? undefined,
      routingFormId: filter.selectedRoutingFormId ?? undefined,
      bookingStatus: filter.selectedBookingStatus ?? undefined,
      fieldFilter: filter.selectedRoutingFormFilter ?? undefined,
      isAll: !!filter.isAll,
      cursor: cursor ?? undefined,
    });
    return result;
  };

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      let allData: RawRoutingData[] = [];
      let hasMore = true;
      let cursor: number | null = null;

      // Fetch data in batches until there's no more data
      while (hasMore) {
        const result: BatchResult = await fetchBatch(cursor);
        allData = [...allData, ...result.data];
        hasMore = result.hasMore;
        cursor = result.nextCursor;
      }

      if (allData.length > 0) {
        const filename = `RoutingInsights-${filter.dateRange[0].format(
          "YYYY-MM-DD"
        )}-${filter.dateRange[1].format("YYYY-MM-DD")}.csv`;
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

export { RoutingDownload };
