import dayjs from "@calcom/dayjs";
import type { SortingState } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";

import { useCsvDownload } from "@lib/hooks/useCsvDownload";

type Props = {
  sorting: SortingState;
};

const BATCH_SIZE = 100;

export const RoutingFormResponsesDownload = ({ sorting }: Props) => {
  const { t } = useLocale();
  const insightsRoutingParameters = useInsightsRoutingParameters();
  const { startDate, endDate } = insightsRoutingParameters;
  const utils = trpc.useUtils();

  const { isDownloading, handleDownload } = useCsvDownload({
    toastId: "routing-form-responses-csv-download",
    fetchBatch: async (offset) => {
      const result = await utils.viewer.insights.routingFormResponsesForDownload.fetch({
        ...insightsRoutingParameters,
        sorting,
        limit: BATCH_SIZE,
        offset,
      });
      return result;
    },
    getFilename: () =>
      `RoutingFormResponses-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format("YYYY-MM-DD")}.csv`,
    errorMessage: t("error_downloading_data"),
    toastTitle: t("downloading"),
    cancelLabel: t("cancel"),
  });

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
        <DropdownItem onClick={handleDownload}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};
