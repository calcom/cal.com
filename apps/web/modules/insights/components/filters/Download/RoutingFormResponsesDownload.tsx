import dayjs from "@calcom/dayjs";
import type { SortingState } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";

import { CsvDownloadButton } from "@lib/components/CsvDownloadButton";

type Props = {
  sorting: SortingState;
};

const BATCH_SIZE = 100;

export const RoutingFormResponsesDownload = ({ sorting }: Props) => {
  const insightsRoutingParameters = useInsightsRoutingParameters();
  const { startDate, endDate } = insightsRoutingParameters;
  const utils = trpc.useUtils();

  return (
    <CsvDownloadButton
      fetchBatch={async (offset) => {
        const result = await utils.viewer.insights.routingFormResponsesForDownload.fetch({
          ...insightsRoutingParameters,
          sorting,
          limit: BATCH_SIZE,
          offset,
        });
        return result;
      }}
      filename={`RoutingFormResponses-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format("YYYY-MM-DD")}.csv`}
    />
  );
};
