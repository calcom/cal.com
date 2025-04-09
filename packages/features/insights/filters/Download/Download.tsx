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

const BATCH_SIZE = 100;

type BookingRecord = {
  id: number;
  uid: string | null;
  title: string | null;
  createdAt: Date | null;
  timeStatus: string | null;
  eventTypeId: number | null;
  eventLength: number | null;
  startTime: Date | null;
  endTime: Date | null;
  paid: boolean | null;
  userEmail: string | null;
  username: string | null;
  rating: number | null;
  ratingFeedback: string | null;
  noShowHost: boolean | null;
  [key: string]: unknown;
};

type PaginatedResponse = {
  data: BookingRecord[];
  total: number;
};

type CsvResponse = {
  data: string;
  filename: string;
};

function isPaginatedResponse(response: unknown): response is PaginatedResponse {
  return (
    !!response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as PaginatedResponse).data) &&
    "total" in response &&
    typeof (response as PaginatedResponse).total === "number"
  );
}

function isCsvResponse(response: unknown): response is CsvResponse {
  return (
    !!response &&
    typeof response === "object" &&
    "data" in response &&
    typeof (response as CsvResponse).data === "string" &&
    "filename" in response &&
    typeof (response as CsvResponse).filename === "string"
  );
}

const Download = () => {
  const { t } = useLocale();
  const { startDate, endDate, teamId, userId, eventTypeId, memberUserId, isAll } = useInsightsParameters();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const utils = trpc.useUtils();

  const fetchBatch = async (offset: number) => {
    return await utils.viewer.insights.rawData.fetch({
      startDate,
      endDate,
      teamId,
      userId,
      eventTypeId,
      memberUserId,
      isAll,
      limit: BATCH_SIZE,
      offset,
    });
  };

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0); // Reset progress
      let allData: BookingRecord[] = [];
      let offset = 0;

      const firstBatch = await fetchBatch(0);
      if (!firstBatch || !isPaginatedResponse(firstBatch)) return;

      allData = [...firstBatch.data];
      const totalRecords = firstBatch.total;

      while (allData.length < totalRecords) {
        offset += BATCH_SIZE;
        const result = await fetchBatch(offset);
        if (!result || !isPaginatedResponse(result)) break;

        allData = [...allData, ...result.data];

        const currentProgress = Math.min(Math.round((allData.length / totalRecords) * 100), 99);
        setDownloadProgress(currentProgress);
      }

      if (allData.length > 0) {
        setDownloadProgress(100); // Set to 100% before actual download

        const csvResult = await utils.viewer.insights.rawData.fetch({
          startDate,
          endDate,
          teamId,
          userId,
          eventTypeId,
          memberUserId,
          isAll,
        });

        if (!csvResult || !isCsvResponse(csvResult)) return;

        downloadAsCsv(csvResult.data, csvResult.filename);
      }
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
