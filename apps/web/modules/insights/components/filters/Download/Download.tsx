import dayjs from "@calcom/dayjs";
import { extractDateRangeFromColumnFilters } from "@calcom/features/insights/lib/bookingUtils";
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
import posthog from "posthog-js";

import { useCsvDownload } from "@lib/use-csv-download";
import { useInsightsBookingParameters } from "../../../hooks/useInsightsBookingParameters";

type RawData = RouterOutputs["viewer"]["insights"]["rawData"]["data"][number];

const BATCH_SIZE = 100;

const Download = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const { startDate, endDate } = extractDateRangeFromColumnFilters(insightsBookingParams.columnFilters);
  const utils = trpc.useUtils();

  const { isDownloading, handleDownload } = useCsvDownload({
    fetchBatch: async (offset) => {
      try {
        const result = await utils.viewer.insights.rawData.fetch({
          ...insightsBookingParams,
          limit: BATCH_SIZE,
          offset,
        });

        if (result && "data" in result && "total" in result) {
          return { data: result.data as RawData[], total: result.total };
        }
        return null;
      } catch {
        return null;
      }
    },
    getFilename: () =>
      `Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format("YYYY-MM-DD")}.csv`,
    errorMessage: t("unexpected_error_try_again"),
    onDownloadStart: () => {
      posthog.capture("insights_bookings_download_clicked", { teamId: insightsBookingParams.selectedTeamId });
    },
  });

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
        <DropdownItem onClick={handleDownload}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export { Download };
