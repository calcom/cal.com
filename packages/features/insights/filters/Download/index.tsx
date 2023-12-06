import { FileDownIcon } from "lucide-react";

import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger, Button } from "@calcom/ui";

const Download = () => {
  const { filter } = useFilterContext();

  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.insights.rawData.useQuery(
    {
      startDate: filter.dateRange[0].toISOString(),
      endDate: filter.dateRange[1].toISOString(),
      teamId: filter.selectedTeamId,
      userId: filter.selectedUserId,
      eventTypeId: filter.selectedEventTypeId,
      memberUserId: filter.selectedMemberUserId,
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

    // Create a Blob from the text data
    const blob = new Blob([csvRaw], { type: "text/plain" });

    // Create an Object URL for the Blob
    const url = window.URL.createObjectURL(blob);

    // Create a download link
    const a = document.createElement("a");
    a.href = url;
    a.download = filename; // Specify the filename

    // Simulate a click event to trigger the download
    a.click();

    // Release the Object URL to free up memory
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          EndIcon={FileDownIcon}
          color="secondary"
          {...(isLoading && { loading: isLoading })}
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

export { Download };
