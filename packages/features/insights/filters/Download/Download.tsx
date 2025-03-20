import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger } from "@calcom/ui/components/dropdown";
import { Button } from "@calcom/ui/components/button";

import { useInsightsParameters } from "../../hooks/useInsightsParameters";

const Download = () => {
  const { t } = useLocale();
  const { startDate, endDate, teamId, userId, eventTypeId, memberUserId } = useInsightsParameters();

  const { data, isPending } = trpc.viewer.insights.rawData.useQuery(
    {
      startDate,
      endDate,
      teamId,
      userId,
      eventTypeId,
      memberUserId,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: Infinity,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  type RawData = RouterOutputs["viewer"]["insights"]["rawData"] | undefined;
  const handleDownloadClick = async (data: RawData) => {
    if (!data) return;
    const { data: csvRaw, filename } = data;
    downloadAsCsv(csvRaw, filename);
  };

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          EndIcon="file-down"
          color="secondary"
          {...(isPending && { loading: isPending })}
          className="h-full self-end sm:self-baseline">
          {t("download")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownItem onClick={() => handleDownloadClick(data)}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export { Download };
