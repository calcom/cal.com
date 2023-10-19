import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useState, useRef } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  collectPageParameters,
  telemetryEventTypes,
  useTelemetry,
} from "@calcom/lib/telemetry";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button, TextArea } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

type Props = {
  booking: {
    title?: string;
    uid?: string;
    id?: number;
  };
  profile: {
    name: string | null;
    slug: string | null;
  };
  recurringEvent: RecurringEvent | null;
  team?: string | null;
  setIsCancellationMode: (value: boolean) => void;
  theme: string | null;
  allRemainingBookings: boolean;
  seatReferenceUid?: string;
};

export default function CancelBooking(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const asPath = `${pathname}?${searchParams.toString()}`;
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const { t } = useLocale();
  const router = useRouter();
  const { booking, allRemainingBookings, seatReferenceUid } = props;
  const [loading, setLoading] = useState(false);
  const telemetry = useTelemetry();
  const [error, setError] = useState<string | null>(booking ? null : t("booking_already_cancelled"));

  const cancelBookingRef = useRef<HTMLTextAreaElement | null>(null);

  const handleCancel = async () => {
    setLoading(true);

    telemetry.event(telemetryEventTypes.bookingCancelled, collectPageParameters());

    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: booking?.uid,
          cancellationReason: cancellationReason,
          allRemainingBookings,
          // @NOTE: very important this shouldn't cancel with number ID use uid instead
          seatReferenceUid,
        }),
      });

      if (res.status >= 200 && res.status < 300) {
        router.replace(asPath);
      } else {
        setLoading(false);
        setError(
          `${t("error_with_status_code_occurred", { status: res.status })} ${t("please_try_again")}`
        );
      }
    } catch (error) {
      setLoading(false);
      setError(t("an_error_occurred_please_try_again"));
    }
  };

  return (
    <>
      {error && (
        <div className="mt-8">
          <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
              {error}
            </h3>
          </div>
        </div>
      )}
      {!error && (
        <div className="mt-5 sm:mt-6">
          <label className="text-default font-medium">{t("cancellation_reason")}</label>
          <TextArea
            data-testid="cancel_reason"
            ref={(node) => {
              cancelBookingRef.current = node;
              if (node) {
                node.scrollIntoView({ behavior: "smooth" });
                node.focus();
              }
            }}
            placeholder={t("cancellation_reason_placeholder")}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="mb-4 mt-2 w-full"
            rows={3}
          />
          <div className="flex flex-col-reverse rtl:space-x-reverse">
            <div className="ml-auto flex w-full space-x-4">
              <Button className="ml-auto" color="secondary" onClick={() => props.setIsCancellationMode(false)}>
                {t("nevermind")}
              </Button>
              <Button data-testid="confirm_cancel" onClick={handleCancel} loading={loading}>
                {props.allRemainingBookings ? t("cancel_all_remaining") : t("cancel_event")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
