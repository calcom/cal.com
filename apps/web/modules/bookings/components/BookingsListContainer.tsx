"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { buildListDisplayColumns } from "../columns/listColumns";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { RowData, BookingListingStatus } from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingsList } from "./BookingsList";

interface BookingsListContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  data: RowData[];
  isPending: boolean;
  totalRowCount?: number;
}

export function BookingsListContainer({
  status,
  permissions,
  data,
  isPending,
  totalRowCount,
}: BookingsListContainerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const utils = trpc.useUtils();

  // Filter out separator rows and extract bookings
  const bookings = useMemo(() => {
    return data
      .filter((row): row is Extract<RowData, { type: "data" }> => row.type === "data")
      .map((row) => row.booking);
  }, [data]);

  const [rejectionDialogIsOpen, setRejectionDialogIsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [pendingRejection, setPendingRejection] = useState<{
    bookingId: number;
    recurringEventId?: string | null;
  } | null>(null);

  const confirmMutation = trpc.viewer.bookings.confirm.useMutation({
    onSuccess: (data) => {
      if (data?.status === "REJECTED") {
        setRejectionDialogIsOpen(false);
        setRejectionReason("");
        setPendingRejection(null);
        showToast(t("booking_rejection_success"), "success");
      } else {
        showToast(t("booking_confirmation_success"), "success");
      }
      utils.viewer.bookings.invalidate();
      utils.viewer.me.bookingUnconfirmedCount.invalidate();
    },
    onError: () => {
      showToast(t("booking_confirmation_failed"), "error");
      utils.viewer.bookings.invalidate();
    },
  });

  const handleAccept = useCallback(
    (bookingId: number, recurringEventId?: string | null) => {
      confirmMutation.mutate({
        bookingId,
        confirmed: true,
        reason: "",
        ...(recurringEventId && { recurringEventId }),
      });
    },
    [confirmMutation]
  );

  const handleReject = useCallback((bookingId: number, recurringEventId?: string | null) => {
    setPendingRejection({ bookingId, recurringEventId });
    setRejectionDialogIsOpen(true);
  }, []);

  const handleConfirmRejection = useCallback(() => {
    if (!pendingRejection) return;

    confirmMutation.mutate({
      bookingId: pendingRejection.bookingId,
      confirmed: false,
      reason: rejectionReason,
      ...(pendingRejection.recurringEventId && { recurringEventId: pendingRejection.recurringEventId }),
    });
  }, [pendingRejection, rejectionReason, confirmMutation]);

  const columns = useMemo(() => {
    const filterCols = buildFilterColumns({ t, permissions, status });
    const listCols = buildListDisplayColumns({
      t,
      user,
      pendingActionHandlers: {
        onAccept: handleAccept,
        onReject: handleReject,
        isLoading: confirmMutation.isPending,
      },
    });
    return [...filterCols, ...listCols];
  }, [t, permissions, status, user, handleAccept, handleReject, confirmMutation.isPending]);

  const getFacetedUniqueValues = useFacetedUniqueValues();

  const table = useReactTable<RowData>({
    data,
    columns,
    initialState: {
      columnVisibility: getFilterColumnVisibility(),
      columnPinning: {
        right: ["actions"],
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  const handleRejectionDialogChange = useCallback((open: boolean) => {
    setRejectionDialogIsOpen(open);
    if (!open) {
      setRejectionReason("");
      setPendingRejection(null);
    }
  }, []);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <Dialog open={rejectionDialogIsOpen} onOpenChange={handleRejectionDialogChange}>
        <DialogContent title={t("rejection_reason_title")} description={t("rejection_reason_description")}>
          <div>
            <TextAreaField
              name="rejectionReason"
              label={
                <>
                  {t("rejection_reason")}
                  <span className="text-subtle font-normal"> (Optional)</span>
                </>
              }
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <DialogClose />
            <Button
              disabled={confirmMutation.isPending}
              data-testid="rejection-confirm"
              onClick={handleConfirmRejection}>
              {t("rejection_confirmation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingsList status={status} table={table} isPending={isPending} totalRowCount={totalRowCount} />

      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
