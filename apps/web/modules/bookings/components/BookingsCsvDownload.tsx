"use client";

import dayjs from "@calcom/dayjs";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button } from "@calcom/ui/components/button";
import { hideProgressToast, showProgressToast, showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import type { BookingListingStatus } from "../types";

type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];
type TranslationFunction = (key: string) => string;

const BATCH_SIZE = 100;

interface BookingsCsvDownloadProps {
  status: BookingListingStatus;
}

function transformBookingToCsv(booking: BookingOutput, t: TranslationFunction) {
  return {
    [t("booking_uid")]: booking.uid,
    [t("title")]: booking.title,
    [t("status")]: booking.status,
    [t("start_time")]: dayjs(booking.startTime).format("YYYY-MM-DD HH:mm:ss"),
    [t("end_time")]: dayjs(booking.endTime).format("YYYY-MM-DD HH:mm:ss"),
    [t("attendee_name")]: booking.attendees.map((a) => a.name).join("; "),
    [t("email")]: booking.attendees.map((a) => a.email).join("; "),
    [t("event_type")]: booking.eventType?.title ?? "",
    [t("location")]: booking.location ?? "",
  };
}

export function BookingsCsvDownload({ status }: BookingsCsvDownloadProps) {
  const { t } = useLocale();
  const { data: user, isPending: isUserPending } = useMeQuery();
  const [isDownloading, setIsDownloading] = useState(false);
  const utils = trpc.useUtils();

  const { eventTypeIds, teamIds, userIds, dateRange, attendeeName, attendeeEmail, bookingUid } =
    useBookingFilters();

  // Only show for users who are part of an organization
  const isOrgUser = Boolean(user?.organizationId);

  if (isUserPending || !isOrgUser) {
    return null;
  }

  const fetchBatch = async (offset: number) => {
    const result = await utils.viewer.bookings.get.fetch({
      limit: BATCH_SIZE,
      offset,
      filters: {
        statuses: [status],
        eventTypeIds,
        teamIds,
        userIds,
        attendeeName,
        attendeeEmail,
        bookingUid,
        afterStartDate: dateRange?.startDate
          ? dayjs(dateRange?.startDate).startOf("day").toISOString()
          : undefined,
        beforeEndDate: dateRange?.endDate ? dayjs(dateRange?.endDate).endOf("day").toISOString() : undefined,
      },
    });

    return {
      bookings: result.bookings,
      totalCount: result.totalCount,
    };
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      showProgressToast(0);

      // Fetch first batch to get total count
      const firstBatch = await fetchBatch(0);
      let allBookings = firstBatch.bookings;
      const totalCount = firstBatch.totalCount;

      // Continue fetching remaining batches
      while (allBookings.length < totalCount) {
        const offset = allBookings.length;
        const batch = await fetchBatch(offset);
        if (batch.bookings.length === 0) break; // Prevent infinite loop if batch returns empty
        allBookings = [...allBookings, ...batch.bookings];

        const currentProgress = Math.min(Math.round((allBookings.length / totalCount) * 100), 99);
        showProgressToast(currentProgress);
      }

      showProgressToast(100);

      // Transform and download
      const csvData = allBookings.map((booking) => transformBookingToCsv(booking, t));
      const filename = `${t("bookings").toLowerCase()}-${status}-${dayjs().format("YYYY-MM-DD")}.csv`;
      downloadAsCsv(csvData, filename);
    } catch {
      showToast(t("unexpected_error_try_again"), "error");
    } finally {
      setIsDownloading(false);
      hideProgressToast();
    }
  };

  return (
    <Button
      color="secondary"
      StartIcon="download"
      loading={isDownloading}
      onClick={handleDownload}
      size="sm"
      className="h-full">
      {t("download")}
    </Button>
  );
}
