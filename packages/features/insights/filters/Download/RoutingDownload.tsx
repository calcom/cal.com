import { useFilterContext } from "@calcom/features/insights/context/provider";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Button, Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger } from "@calcom/ui";

const RoutingDownload = () => {
  const { filter } = useFilterContext();
  const { t } = useLocale();

  const { data, isPending } = trpc.viewer.insights.rawRoutingData.useQuery(
    {
      startDate: filter.dateRange[0].toISOString(),
      endDate: filter.dateRange[1].toISOString(),
      teamId: filter.selectedTeamId,
      userId: filter.selectedUserId,
      routingFormId: filter.selectedRoutingFormId,
      bookingStatus: filter.selectedBookingStatus,
      fieldFilter: filter.selectedFieldFilter,
      isAll: filter.isAll,
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

  type RawRoutingData = RouterOutputs["viewer"]["insights"]["rawRoutingData"] | undefined;
  const handleDownloadClick = async (data: RawRoutingData) => {
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
          className="self-end sm:self-baseline">
          {t("download")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownItem onClick={() => handleDownloadClick(data)}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export { RoutingDownload };
