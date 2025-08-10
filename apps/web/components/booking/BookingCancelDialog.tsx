"use client";

// adjust import path
import { Button } from "@calid/features/ui";
import { Checkbox } from "@calid/features/ui";
import { useToast } from "@calid/features/ui";
import { useSession } from "next-auth/react";
import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";

import { sdkActionManager } from "@calcom/embed-core/embed-iframe";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRefreshData } from "@calcom/lib/hooks/useRefreshData";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

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

  const refreshData = useRefreshData();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Email copied", "success");
  };

  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingUId: bookingId } = props;

  const handleClose = () => {
    setIsOpenDialog(false);
  };

  const { data: session } = useSession();

  const currentUserEmail = session?.user?.email ?? undefined;

  const bookingCancelledEventProps = {
    booking: props,
    organizer: {
      name: props?.user?.name || "Nameless",
      email: props?.userPrimaryEmail || props?.user?.email || "Email-less",
      timeZone: props?.user?.timeZone,
    },
    eventType: props.eventType,
  };

  const telemetry = useTelemetry();

  const handleCancel = async () => {
    setLoading(true);

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
      refreshData();
    } else {
      showToast(
        `${t("error_with_status_code_occured", { status: res.status })} ${t("please_try_again")}`,
        "error"
      );

      // useToast({
      //   id: "cancel-event-error",
      //   title: t("failure"),
      //   description:,
      // });
      // showToast({
      //   message: `${t("error_with_status_code_occured", { status: res.status })} ${t("please_try_again")}`,
      //   type: "failure",
      // });
    }

    setLoading(false);
  };

  if (!isOpenDialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mx-[160px] flex items-center">
          <h2 className="px-0 py-[12px] text-center text-xl font-semibold text-gray-900">Cancel Event</h2>
        </div>

        {props.recurringEventId && selectedRecurringDates.length > 0 ? (
          <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="flex gap-3">
              <span className="min-w-16 font-medium text-gray-600">Event:</span>
              <span className="text-gray-900">{props.eventType?.title || props.title}</span>
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
          <div className="my-0 mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="flex gap-3">
              <span className="min-w-16 font-medium text-gray-600">{t("event_upper_case")}</span>
              <span className="text-gray-900">{props.eventType?.title || props.title}</span>
            </div>
            <div className="flex gap-3">
              <span className="min-w-16 font-medium text-gray-600">{t("when")}</span>
              <span className="text-gray-900">
                {new Date(props.startTime).toLocaleDateString()}{" "}
                {new Date(props.startTime).toLocaleTimeString()} -{" "}
                {new Date(props.endTime).toLocaleTimeString()}
              </span>
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
                      {attendee.name}
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
        )}

        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-900">
            {t("cancellation_reason_host")}
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="h-24 w-full resize-none rounded-md border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Why are you cancelling?"
          />
        </div>
        {/* {error && (
          <div className="my-3 flex flex-row">
            <div className="bg-error mx-auto flex h-6 w-6 items-center justify-center rounded-full">
              <Icon name="x" className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-center ">
              <h3 className="text-emphasis text-sm font-medium leading-6" id="modal-title">
                {error}
              </h3>
            </div>
          </div>
        )} */}

        <div className="flex justify-end  space-x-3">
          <Button variant="outline" onClick={handleClose}>
            {t("nevermind")}
          </Button>
          <Button variant="destructive" loading={loading} onClick={handleCancel} className="text-white min-w-[7.5rem]">
            {t("cancel_event")}
          </Button>
        </div>
      </div>
    </div>
  );
}
