"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import { AddToWatchlistModal } from "./add-to-watchlist-modal";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface BulkAddToWatchlistProps {
  reports: BookingReport[];
  onSuccess: () => void;
}

export function BulkAddToWatchlist({ reports, onSuccess }: BulkAddToWatchlistProps) {
  const { t } = useLocale();
  const [showModal, setShowModal] = useState(false);

  const reportsToAdd = reports.filter((report) => !report.watchlistId);

  const handleModalClose = () => {
    setShowModal(false);
    onSuccess();
  };

  if (reportsToAdd.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        color="secondary"
        StartIcon="shield-check"
        onClick={() => {
          setShowModal(true);
        }}>
        {t("add_to_watchlist")}
      </Button>

      {showModal && (
        <AddToWatchlistModal open={showModal} onClose={handleModalClose} reports={reportsToAdd} />
      )}
    </>
  );
}
