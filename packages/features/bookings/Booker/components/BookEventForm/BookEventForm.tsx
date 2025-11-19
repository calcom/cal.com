import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import type { TFunction } from "i18next";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import type { FieldError } from "react-hook-form";

import { useIsPlatformBookerEmbed } from "@calcom/atoms/hooks/useIsPlatformBookerEmbed";
import type { BookerEvent } from "@calcom/features/bookings/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import {
  RECAPTCHA_KEY_HIGH,
  RECAPTCHA_KEY_LOW,
  RECAPTCHA_KEY_MEDIUM,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
} from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import { Alert } from "@calcom/ui/components/alert";
import { Form } from "@calcom/ui/components/form";

import { useBookerStore } from "../../store";
import { formatEventFromTime } from "../../utils/dates";
import type { UseBookingFormReturnType } from "../hooks/useBookingForm";
import type { IUseBookingErrors, IUseBookingLoadingStates } from "../hooks/useBookings";
import { BookingFields } from "./BookingFields";
import { FormSkeleton } from "./Skeleton";

type BookEventFormProps = {
  onCancel?: () => void;
  onSubmit: () => void;
  errorRef: React.RefObject<HTMLDivElement>;
  errors: UseBookingFormReturnType["errors"] & IUseBookingErrors;
  loadingStates: IUseBookingLoadingStates;
  children?: React.ReactNode;
  bookingForm: UseBookingFormReturnType["bookingForm"];
  renderConfirmNotVerifyEmailButtonCond: boolean;
  extraOptions: Record<string, string | string[]>;
  isPlatform?: boolean;
  isVerificationCodeSending: boolean;
  isTimeslotUnavailable: boolean;
  shouldRenderCaptcha?: boolean;
  confirmButtonDisabled?: boolean;
  classNames?: {
    confirmButton?: string;
    backButton?: string;
  };
};

export const BookEventForm = ({
  onCancel,
  eventQuery,
  onSubmit,
  errorRef,
  errors,
  loadingStates,
  renderConfirmNotVerifyEmailButtonCond,
  bookingForm,
  children,
  extraOptions,
  isVerificationCodeSending,
  isPlatform = false,
  isTimeslotUnavailable,
  shouldRenderCaptcha,
  confirmButtonDisabled,
  classNames,
  billingAddressRequired = false,
}: Omit<BookEventFormProps, "event"> & {
  eventQuery: {
    isError: boolean;
    isPending: boolean;
    data?: Pick<
      BookerEvent,
      "price" | "currency" | "metadata" | "bookingFields" | "locations" | "captchaType"
    > | null;
  };
  billingAddressRequired: boolean;
}) => {
  const eventType = eventQuery.data;
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const bookingData = useBookerStore((state) => state.bookingData);
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const instanceDate = useBookerStore((state) => state.instanceDate); // For determining reschedule type
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const username = useBookerStore((state) => state.username);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();

  const [responseVercelIdHeader] = useState<string | null>(null);
  const { t, i18n } = useLocale();

  // reCAPTCHA ref for invisible captcha
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  // Determine if this is a recurring instance reschedule
  const isRecurringInstanceReschedule = Boolean(rescheduleUid && instanceDate);

  useEffect(() => {
    if (eventType && billingAddressRequired) {
      const appended = eventType.bookingFields.some((field) => field.name === "_line1");
      if (!appended)
        eventType.bookingFields.push(
          {
            name: "_line1",
            type: "address",
            defaultLabel: "Address Line 1",
            required: true,
          },
          {
            name: "city",
            type: "address",
            defaultLabel: "City",
            required: true,
          },
          {
            name: "state",
            type: "address",
            defaultLabel: "State",
            required: true,
          },
          {
            name: "country",
            type: "address",
            defaultLabel: "Country",
            required: true,
          },
          {
            name: "postal_code",
            type: "address",
            defaultLabel: "Postal Code",
            required: true,
          }
        );
    }
  }, [eventType, billingAddressRequired]);

  const isPaidEvent = useMemo(() => {
    if (!eventType?.price) return false;
    const paymentAppData = getPaymentAppData(eventType);
    return eventType?.price > 0 && !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;
  }, [eventType]);

  // Map captcha types to reCAPTCHA keys
  const reCaptchaMap = {
    LOW: RECAPTCHA_KEY_LOW,
    MEDIUM: RECAPTCHA_KEY_MEDIUM,
    HIGH: RECAPTCHA_KEY_HIGH,
  };

  const recaptchaKey = eventType?.captchaType
    ? reCaptchaMap[eventType.captchaType as keyof typeof reCaptchaMap]
    : undefined;

  // Handle form submission with reCAPTCHA verification
  const handleFormSubmit = async () => {
    // If reCAPTCHA is configured for this event, verify it first
    if (recaptchaRef.current && eventType?.captchaType) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        recaptchaRef.current.reset();

        if (token) {
          const response = await fetch("/api/verify-recaptcha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              type: eventType.captchaType as keyof typeof reCaptchaMap,
            }),
          });

          const data = await response.json();
          if (data.success) {
            onSubmit();
          } else {
            console.error("reCAPTCHA verification failed", data.error);
            // Optionally show an error to the user here
          }
        }
      } catch (error) {
        console.error("reCAPTCHA error:", error);
        // Optionally show an error to the user here
      }
    } else {
      // No reCAPTCHA configured, proceed directly
      onSubmit();
    }
  };

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isPending || !eventQuery.data) return <FormSkeleton />;
  if (!timeslot)
    return (
      <BlankCard
        Icon="calendar"
        headline={t("timeslot_missing_title")}
        description={t("timeslot_missing_description")}
        buttonText={t("timeslot_missing_cta")}
        buttonOnClick={onCancel}
      />
    );

  if (!eventType) {
    console.warn("No event type found for event", extraOptions);
    return <Alert severity="warning" message={t("error_booking_event")} />;
  }

  const watchedCfToken = bookingForm.watch("cfToken");

  return (
    <div className="flex h-full flex-col">
      <Form
        className="flex h-full flex-col"
        onChange={() => {
          // Form data is saved in store. This way when user navigates back to
          // still change the timeslot, and comes back to the form, all their values
          // still exist. This gets cleared when the form is submitted.
          const values = bookingForm.getValues();
          setFormValues(values);
        }}
        form={bookingForm}
        handleSubmit={handleFormSubmit}
        noValidate>
        <BookingFields
          isDynamicGroupBooking={!!(username && username.indexOf("+") > -1)}
          fields={eventType.bookingFields}
          locations={eventType.locations}
          rescheduleUid={rescheduleUid || undefined}
          bookingData={bookingData}
        />
        {errors.hasFormErrors || errors.hasDataErrors ? (
          <div data-testid="booking-fail">
            <Alert
              ref={errorRef}
              className="my-2"
              severity="info"
              title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
              message={getError({
                globalError: errors.formErrors,
                dataError: errors.dataErrors,
                t,
                responseVercelIdHeader,
                timeFormat: "h:mma" as TimeFormat,
                timezone: "UTC",
                language: i18n.language,
              })}
            />
          </div>
        ) : isTimeslotUnavailable ? (
          <div data-testid="slot-not-allowed-to-book">
            <Alert
              severity="info"
              title={t("unavailable_timeslot_title")}
              message={
                <ServerTrans
                  t={t}
                  i18nKey="timeslot_unavailable_book_a_new_time"
                  components={[
                    <button
                      key="please-select-a-new-time-button"
                      type="button"
                      className="underline"
                      onClick={onCancel}>
                      Please select a new time
                    </button>,
                  ]}
                />
              }
            />
          </div>
        ) : null}

        {!isPlatform && (
          <div className="text-subtle my-3 w-full text-xs">
            <ServerTrans
              t={t}
              i18nKey="signing_up_terms"
              components={[
                <Link
                  className="text-emphasis hover:underline"
                  key="terms"
                  href={`${WEBSITE_TERMS_URL}`}
                  target="_blank">
                  Terms
                </Link>,
                <Link
                  className="text-emphasis hover:underline"
                  key="privacy"
                  href={`${WEBSITE_PRIVACY_POLICY_URL}`}
                  target="_blank">
                  Privacy Policy.
                </Link>,
              ]}
            />
          </div>
        )}

        {isPlatformBookerEmbed && (
          <div className="text-subtle my-3 w-full text-xs">
            {t("proceeding_agreement")}{" "}
            <Link
              className="text-emphasis hover:underline"
              key="terms"
              href={`${WEBSITE_TERMS_URL}`}
              target="_blank">
              {t("terms")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              className="text-emphasis hover:underline"
              key="privacy"
              href={`${WEBSITE_PRIVACY_POLICY_URL}`}
              target="_blank">
              {t("privacy_policy")}
            </Link>
            .
          </div>
        )}
        <div className="modalsticky mt-auto flex justify-end space-x-2 rtl:space-x-reverse">
          {isInstantMeeting ? (
            <Button type="submit" color="primary" loading={loadingStates.creatingInstantBooking}>
              {isPaidEvent ? t("pay_and_book") : t("confirm")}
            </Button>
          ) : (
            <>
              {!!onCancel && (
                <Button
                  color="minimal"
                  type="button"
                  onClick={onCancel}
                  data-testid="back"
                  className={classNames?.backButton}>
                  {t("back")}
                </Button>
              )}

              <Button
                type="submit"
                color="primary"
                disabled={
                  (!!shouldRenderCaptcha && !watchedCfToken) || isTimeslotUnavailable || confirmButtonDisabled
                }
                loading={
                  loadingStates.creatingBooking ||
                  loadingStates.creatingRecurringBooking ||
                  isVerificationCodeSending
                }
                className={classNames?.confirmButton}
                data-testid={
                  rescheduleUid && bookingData ? "confirm-reschedule-button" : "confirm-book-button"
                }>
                {rescheduleUid && bookingData
                  ? isRecurringInstanceReschedule
                    ? t("reschedule_instance")
                    : t("reschedule")
                  : renderConfirmNotVerifyEmailButtonCond
                  ? isPaidEvent
                    ? t("pay_and_book")
                    : t("confirm")
                  : t("verify_email_button")}
              </Button>
            </>
          )}
        </div>
        {/* Render invisible reCAPTCHA if configured */}
        {recaptchaKey && <ReCAPTCHA ref={recaptchaRef} sitekey={recaptchaKey} size="invisible" />}
      </Form>
      {children}
    </div>
  );
};

const getError = ({
  globalError,
  dataError,
  t,
  responseVercelIdHeader,
  timeFormat,
  timezone,
  language,
}: {
  globalError: FieldError | undefined;
  // It feels like an implementation detail to reimplement the types of useMutation here.
  // Since they don't matter for this function, I'd rather disable them then giving you
  // the cognitive overload of thinking to update them here when anything changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataError: any;
  t: TFunction;
  responseVercelIdHeader: string | null;
  timeFormat: TimeFormat;
  timezone: string;
  language: string;
}) => {
  if (globalError) return globalError?.message;

  const error = dataError;

  let date = "";

  if (error.message === ErrorCode.BookerLimitExceededReschedule) {
    const formattedDate = formatEventFromTime({
      date: error.data.startTime,
      timeFormat,
      timeZone: timezone,
      language,
    });
    date = `${formattedDate.date} ${formattedDate.time}`;
  }

  return error?.message ? (
    <>
      {responseVercelIdHeader ?? ""} {t(error.message, { date })}
    </>
  ) : (
    <>{t("can_you_try_again")}</>
  );
};
