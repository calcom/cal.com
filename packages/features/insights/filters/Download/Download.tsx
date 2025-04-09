import { useState } from "react";

import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";

import { useInsightsParameters } from "../../hooks/useInsightsParameters";

const Download = () => {
  const { t } = useLocale();
  const { startDate, endDate, teamId, userId, eventTypeId, memberUserId, isAll } = useInsightsParameters();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const utils = trpc.useUtils();

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0); // Reset progress

      setDownloadProgress(50);

      const data = await utils.viewer.insights.rawData.fetch({
        startDate,
        endDate,
        teamId,
        userId,
        eventTypeId,
        memberUserId,
        isAll,
      });

      if (!data) return;

      setDownloadProgress(100);

      const { data: csvRaw, filename } = data;
      downloadAsCsv(csvRaw, filename);
    } catch (error) {
      showToast(t("unexpected_error_try_again"), "error");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0); // Reset progress
    }
  };

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          EndIcon="file-down"
          color="secondary"
          loading={isDownloading}
          className="h-full self-end sm:self-baseline">
          {isDownloading ? `${Math.floor(downloadProgress)}%` : t("download")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownItem onClick={handleDownloadClick}>{t("as_csv")}</DropdownItem>
      </DropdownMenuContent>
    </Dropdown>
  );
};

export { Download };
