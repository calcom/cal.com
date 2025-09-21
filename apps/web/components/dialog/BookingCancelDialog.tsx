"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import { Switch } from "@calid/features/ui/components/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useSession } from "next-auth/react";
import type { Dispatch, SetStateAction } from "react";
import React, { useState, useEffect } from "react";

import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRefreshData } from "@calcom/lib/hooks/useRefreshData";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

type BookingItem = RouterOutputs["viewer"]["bookings"]["calid_get"]["bookings"][number];

export type CancelEventDialogProps = BookingItem & {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUId: string;
  seatReferenceUid: string | undefined;
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
  const { isOpenDialog, setIsOpenDialog, bookingUId: bookingId } = props;

  const { data: session } = useSession();

  const currentUserEmail = session?.user?.email ?? undefined;
  const currentUserId = session?.user?.id;

  // Determine if current user is the host
  const isHost = currentUserId && props.user?.id === currentUserId;

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

    const res = await fetch("/api/cancel", {
      body: JSON.stringify({
        uid: props.uid,
        cancellationReason: cancelReason.trim() || null,
        allRemainingBookings: false,
        // @NOTE: very important this shouldn't cancel with number ID use uid instead
        // seatReferenceUid: props.seatReferenceUid, // REVIEW: do we need this?
        cancelledBy: currentUserEmail,
        internalNote: null, // TODO: internalNote
        autoRefund: autoRefund, // Dynamic value based on user selection
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const bookingWithCancellationReason = {
      ...(bookingCancelledEventProps.booking as object),
      cancelReason,
    } as unknown;

    if (res.status >= 200 && res.status < 300) {
      // tested by apps/web/playwright/booking-pages.e2e.ts
      sdkActionManager?.fire("bookingCancelled", {
        ...bookingCancelledEventProps,
        booking: bookingWithCancellationReason,
      });
      triggerToast(t("booking_cancelled"), "success");
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

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t("cancel_event")}</DialogTitle>
        </DialogHeader>

        {props.recurringEventId && selectedRecurringDates.length > 0 ? (
          <div className="bg-muted mb-6 space-y-3 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-emphasis min-w-16 font-medium">{t("event")}</span>
              <span className="text-default">{props.eventType?.title || props.title}</span>
            </div>
            <div className="flex gap-3">
              <span className="min-w-16 font-medium text-gray-600">When:</span>
              <div className="text-gray-900">
                {selectedRecurringDates.map((date, index) => (
                  <div key={index}>{date}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <span className="min-w-16 font-medium text-gray-600">{t("where")}</span>
              <span className="text-gray-900">{props.location || "*LOCATION"}</span>
            </div>
            <div className="flex gap-3">
              <span className="min-w-16 font-medium text-gray-600">{t("with")}</span>
              <div className="flex flex-wrap gap-1">
                {props.attendees?.map((attendee, index) => (
                  <div key={index}>
                    <button
                      className="text-foreground hover:text-foreground hover:underline"
                      onClick={() => copyToClipboard(attendee.email)}
                      title="Copy email">
                      {attendee.name || attendee.email}
                      {index < (props.attendees?.length || 0) - 1 && ","}
                    </button>
                  </div>
                )) || "*ATTENDEES"}
              </div>
            </div>
            {props.description && (
              <div className="flex gap-3">
                <span className="min-w-16 font-medium text-gray-600">{t("additional_notes")}</span>
                <span className="text-gray-900">{props.description}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted my-0 mb-6 space-y-3 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-emphasis min-w-16 font-medium">{t("event_upper_case")}</span>
              <span className="text-default">{props.eventType?.title || props.title}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emphasis min-w-16 font-medium">{t("when")}</span>
              <span className="text-default">
                {new Date(props.startTime).toLocaleDateString()}{" "}
                {new Date(props.startTime).toLocaleTimeString()} -
                {new Date(props.endTime).toLocaleDateString()} {new Date(props.endTime).toLocaleTimeString()}
              </span>
            </div>
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
        )}

        <div className="mb-6">
          <label className="text-emphasis mb-3 block text-sm font-medium">
            {t("cancellation_reason_host")}
          </label>
          <textarea
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
              <span className="text-subtle text-sm">{t("autorefund_description")}</span>
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
            {loading ? t("cancelling") : t("cancel_event")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
