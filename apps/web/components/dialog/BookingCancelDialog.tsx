"use client";

import { getActualRecurringStartTime } from "@calid/features/modules/teams/lib/recurrenceUtil";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Switch } from "@calid/features/ui/components/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useSession } from "next-auth/react";
import type { Dispatch, SetStateAction } from "react";
import React, { useState, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRefreshData } from "@calcom/lib/hooks/useRefreshData";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

type BookingItem = RouterOutputs["viewer"]["bookings"]["calid_get"]["bookings"][number];

export type CancelEventDialogProps = BookingItem & {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUId: string;
  seatReferenceUid: string | undefined;
  isTabRecurring?: boolean; // New prop to indicate if viewing from recurring tab
};

export function BookingCancelDialog(props: CancelEventDialogProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [selectedRecurringDates, setSelectedRecurringDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefund, setAutoRefund] = useState(false);

  const refreshData = useRefreshData();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast("Email copied", "success");
  };

  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingUId: bookingId, isTabRecurring = false } = props;

  const { data: session } = useSession();

  const currentUserEmail = session?.user?.email ?? undefined;
  const currentUserId = session?.user?.id;

  // Determine if current user is the host
  const isHost = currentUserId && props.user?.id === currentUserId;

  // Check if this is a recurring booking
  const recurringEvent = props.metadata?.recurringEvent;
  const isRecurringBooking = !!recurringEvent;

  // Determine the cancellation scenario
  const isCancellingEntireSeries = isRecurringBooking && isTabRecurring;
  const isCancellingSingleInstance = isRecurringBooking && !isTabRecurring;

  const bookingCancelledEventProps = {
    booking: props,
    organizer: {
      name: props?.user?.name || "Nameless",
      email: props?.userPrimaryEmail || props?.user?.email || "Email-less",
    },
    eventType: props.eventType,
  };

  const telemetry = useTelemetry();

  // Clear error and reset autoRefund when dialog opens
  useEffect(() => {
    if (isOpenDialog) {
      setError(null);
      setAutoRefund(false);
    }
  }, [isOpenDialog]);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    telemetry.event(telemetryEventTypes.bookingCancelled, collectPageParameters());

    // Prepare the cancel request body
    const cancelBody: any = {
      uid: props.uid,
      cancellationReason: cancelReason.trim() || undefined,
      allRemainingBookings: isCancellingEntireSeries, // Cancel all if viewing series
      cancelledBy: currentUserEmail,
      internalNote: null,
      autoRefund: autoRefund,
    };

    // If cancelling a single instance, add the cancelledDates array
    if (isCancellingSingleInstance) {
      cancelBody.cancelledDates = [new Date(props.startTime).toISOString()];
    }

    const res = await fetch("/api/cancel", {
      body: JSON.stringify(cancelBody),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    await utils.viewer.bookings.invalidate();

    const bookingWithCancellationReason = {
      ...(bookingCancelledEventProps.booking as object),
      cancelReason,
    } as unknown;

    if (res.status >= 200 && res.status < 300) {
      sdkActionManager?.fire("bookingCancelled", {
        ...bookingCancelledEventProps,
        booking: bookingWithCancellationReason,
      });

      const successMessage = isCancellingSingleInstance
        ? t("booking_instance_cancelled")
        : t("booking_cancelled");

      triggerToast(successMessage, "success");
      refreshData();
      setIsOpenDialog(false);
    } else {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage =
        errorData.message ||
        `${t("error_with_status_code_occured", { status: res.status })} ${t("please_try_again")}`;
      triggerToast(errorMessage, "error");
      setError(errorMessage);
    }

    setLoading(false);
  };

  // Render the "When" section based on booking type
  const renderWhenSection = () => {
    console.log("isCancellingEntireSeries", isCancellingEntireSeries, recurringEvent); // --- IGNORE ---

    if (isCancellingEntireSeries && recurringEvent) {
      // Case 1: Viewing recurring series - show recurrence summary
      return (
        <div className="flex gap-3">
          <span className="text-emphasis min-w-16 font-medium">{t("when")}</span>
          <div className="text-default">
            <div className="font-medium">
              {getEveryFreqFor({
                t,
                recurringEvent,
                recurringCount: recurringEvent.count ?? undefined,
              })}
            </div>
            <div className="text-subtle mt-1 text-sm">
              {(() => {
                const actualStartTime = getActualRecurringStartTime(recurringEvent, props.startTime);
                const actualEndTime = dayjs(actualStartTime)
                  .add(dayjs(props.endTime).diff(dayjs(props.startTime)), "millisecond")
                  .toDate();

                return (
                  <>
                    {t("starting")} {dayjs(actualStartTime).format("MMMM D, YYYY")} |{" "}
                    {dayjs(actualStartTime).format("h:mm A")} - {dayjs(actualEndTime).format("h:mm A")}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      );
    } else {
      // Case 2 & 3: Single instance or non-recurring booking
      return (
        <div className="flex gap-3">
          <span className="text-emphasis min-w-16 font-medium">{t("when")}</span>
          <span className="text-default">
            {dayjs(props.startTime).format("MMMM D, YYYY")} | {dayjs(props.startTime).format("h:mm A")} -{" "}
            {dayjs(props.endTime).format("h:mm A")}
          </span>
        </div>
      );
    }
  };

  // Determine the cancel button text
  const getCancelButtonText = () => {
    if (loading) return t("cancelling");
    if (isCancellingEntireSeries) return t("cancel_all_remaining");
    if (isCancellingSingleInstance) return t("cancel_this_instance");
    return t("cancel_event");
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {isCancellingEntireSeries
              ? t("cancel_recurring_event")
              : isCancellingSingleInstance
              ? t("cancel_event_instance")
              : t("cancel_event")}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted my-0 mb-6 space-y-3 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-emphasis min-w-16 font-medium">{t("event_upper_case")}</span>
            <span className="text-default">{props.eventType?.title || props.title}</span>
          </div>

          {renderWhenSection()}

          <div className="flex gap-3">
            <span className="text-emphasis min-w-16 font-medium">{t("where")}</span>
            <span className="text-default">{props.location?.split(":")[1] || "*LOCATION"}</span>
          </div>

          <div className="flex gap-3">
            <span className="text-emphasis min-w-16 font-medium">{t("with")}</span>
            <div className="flex flex-wrap gap-1">
              {props.attendees?.map((attendee, index) => (
                <div key={index}>
                  <button
                    className="text-default hover:text-default hover:underline"
                    onClick={() => copyToClipboard(attendee.email)}>
                    {attendee.name}
                    {index < (props.attendees?.length || 0) - 1 && ","}
                  </button>
                </div>
              )) || "*ATTENDEES"}
            </div>
          </div>

          {props.description && (
            <div className="flex gap-3">
              <span className="text-emphasis min-w-16 font-medium">{t("additional_notes")}</span>
              <span className="text-default">{props.description}</span>
            </div>
          )}
        </div>

        {/* Warning message for single instance cancellation */}
        {isCancellingSingleInstance && (
          <div className="bg-subtle mb-4 rounded-lg p-3">
            <p className="text-default text-sm">{t("cancel_instance_warning")}</p>
          </div>
        )}

        <div className="mb-6">
          <label className="text-emphasis mb-3 block text-sm font-medium">{t("cancellation_reason")}</label>
          <TextArea
            data-testid="cancel_reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="border-default h-24 w-full resize-none rounded-md border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t("cancellation_reason_placeholder")}
          />
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>

        {/* AutoRefund toggle - only show for hosts with paid bookings */}
        {isHost && props.paid && (
          <div className="mb-6">
            <div className="flex w-full items-center justify-between">
              <label className="text-default font-medium">{t("autorefund")}</label>
              <Switch
                tooltip={t("autorefund_info")}
                checked={autoRefund}
                onCheckedChange={(val) => {
                  setAutoRefund(val);
                }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-subtle text-sm">{t("autorefund_info")}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose />
          <Button
            data-testid="confirm_cancel"
            color="primary"
            loading={loading}
            disabled={loading}
            onClick={handleCancel}>
            {getCancelButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
