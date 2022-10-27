import { useRouter } from "next/router";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button } from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";

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
};

export default function CancelBooking(props: Props) {
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const { t } = useLocale();
  const router = useRouter();
  const { booking, profile, team } = props;
  const [loading, setLoading] = useState(false);
  const telemetry = useTelemetry();
  const [error, setError] = useState<string | null>(booking ? null : t("booking_already_cancelled"));
  useTheme(props.theme);

  return (
    <>
      {error && (
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Icon.FiX className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
              {error}
            </h3>
          </div>
        </div>
      )}
      {!error && (
        <div className="mt-5 sm:mt-6">
          <label className="text-bookingdark font-medium dark:text-white">{t("cancellation_reason")}</label>
          <textarea
            placeholder={t("cancellation_reason_placeholder")}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="mt-2 mb-3 w-full dark:border-gray-900 dark:bg-gray-700 dark:text-white sm:mb-3 "
            rows={3}
          />
          <div className="flex flex-col-reverse rtl:space-x-reverse sm:flex-row">
            {!props.recurringEvent && (
              <div className="border-bookinglightest mt-5 flex w-full justify-center border-t pt-3 sm:mt-0 sm:justify-start sm:border-0 sm:pt-0">
                <Button
                  color="secondary"
                  className="border-0 sm:border"
                  onClick={() => router.push(`/reschedule/${booking?.uid}`)}>
                  {t("reschedule_this")}
                </Button>
              </div>
            )}
            <div className="mb-2 flex w-full space-x-2 text-right sm:mb-0 ">
              <Button color="secondary" onClick={() => props.setIsCancellationMode(false)}>
                {t("nevermind")}
              </Button>
              <Button
                className="flex grow justify-center"
                data-testid="cancel"
                onClick={async () => {
                  setLoading(true);

                  const payload = {
                    id: booking?.id,
                    cancellationReason: cancellationReason,
                  };

                  telemetry.event(telemetryEventTypes.bookingCancelled, collectPageParameters());

                  const res = await fetch("/api/cancel", {
                    body: JSON.stringify(payload),
                    headers: {
                      "Content-Type": "application/json",
                    },
                    method: "DELETE",
                  });

                  if (res.status >= 200 && res.status < 300) {
                    await router.push(
                      `/cancel/success?name=${props.profile.name}&title=${booking?.title}&eventPage=${
                        profile.slug
                      }&team=${team ? 1 : 0}&recurring=${!!props.recurringEvent}`
                    );
                  } else {
                    setLoading(false);
                    setError(
                      `${t("error_with_status_code_occured", { status: res.status })} ${t(
                        "please_try_again"
                      )}`
                    );
                  }
                }}
                loading={loading}>
                {t("cancel_event")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
