import { FileDownIcon } from "lucide-react";
import { useState } from "react";

import { useFilterContext } from "@calcom/features/insights/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger, Button } from "@calcom/ui";

const Download = () => {
  const { filter } = useFilterContext();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();

  const handleDownloadClick = () => {
    setIsLoading(true);

    // Create a new URL object with the base URL
    const destinationUrl = new URL(`${WEBAPP_URL}/api/insights/download`);

    // Set query parameters
    destinationUrl.searchParams.set("startDate", filter.dateRange[0].toISOString());
    destinationUrl.searchParams.set("endDate", filter.dateRange[1].toISOString());
    filter.selectedTeamId && destinationUrl.searchParams.set("teamId", filter.selectedTeamId?.toString());
    filter.selectedUserId && destinationUrl.searchParams.set("userId", filter.selectedUserId?.toString());
    filter.selectedEventTypeId &&
      destinationUrl.searchParams.set("eventType", filter.selectedEventTypeId?.toString());
    filter.selectedMemberUserId &&
      destinationUrl.searchParams.set("memberUserId", filter.selectedMemberUserId?.toString());

    // Simulate a loading delay (replace this with your actual download preparation logic)
    setTimeout(() => {
      setIsLoading(false);
      // Trigger the download when the loading is complete
      window.location.href = destinationUrl.toString();
    }, 2000); // Simulated 2-second loading delay
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
        <DropdownItem>
          <button onClick={handleDownloadClick} disabled={isLoading}>
            {t("as_csv")}
          </button>
        </DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export { Download };
