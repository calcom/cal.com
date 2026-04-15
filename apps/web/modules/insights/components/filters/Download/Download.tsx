import dayjs from "@calcom/dayjs";
import { extractDateRangeFromColumnFilters } from "@calcom/features/insights/lib/bookingUtils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { CsvDownloadButton } from "@lib/components/CsvDownloadButton";
import posthog from "posthog-js";
import { useInsightsBookingParameters } from "../../../hooks/useInsightsBookingParameters";

type RawData = RouterOutputs["viewer"]["insights"]["rawData"]["data"][number];

const BATCH_SIZE = 100;

const Download = () => {
  const insightsBookingParams = useInsightsBookingParameters();
  const { startDate, endDate } = extractDateRangeFromColumnFilters(insightsBookingParams.columnFilters);
  const utils = trpc.useUtils();

  return (
    <CsvDownloadButton<RawData>
      fetchBatch={async (offset) => {
        const result = await utils.viewer.insights.rawData.fetch({
          ...insightsBookingParams,
          limit: BATCH_SIZE,
          offset,
        });

        if (result && "data" in result && "total" in result) {
          return { data: result.data as RawData[], total: result.total };
        }
        return null;
      }}
      filename={`Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format("YYYY-MM-DD")}.csv`}
      onDownloadStart={() => {
        posthog.capture("insights_bookings_download_clicked", {
          teamId: insightsBookingParams.selectedTeamId,
        });
      }}
    />
  );
};

export { Download };
