import type { TFunction } from "i18next";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FieldError } from "react-hook-form";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import { useIsPlatformBookerEmbed } from "@calcom/atoms/hooks/useIsPlatformBookerEmbed";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { BookerEvent } from "@calcom/features/bookings/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { WEBSITE_PRIVACY_POLICY_URL, WEBSITE_TERMS_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Form } from "@calcom/ui/components/form";

import { formatEventFromTime } from "@calcom/features/bookings/Booker/utils/dates";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/hooks/useBookingForm";
import type { IUseBookingErrors, IUseBookingLoadingStates } from "../../hooks/useBookings";
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
  timeslot: string | null;
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
  timeslot,
}: Omit<BookEventFormProps, "event"> & {
  eventQuery: {
    isError: boolean;
    isPending: boolean;
    data?: Pick<BookerEvent, "price" | "currency" | "metadata" | "bookingFields" | "locations"> | null;
  };
}) => {
  const eventType = eventQuery.data;
  const setFormValues = useBookerStoreContext((state) => state.setFormValues);
  const bookingData = useBookerStoreContext((state) => state.bookingData);
  const rescheduleUid = useBookerStoreContext((state) => state.rescheduleUid);
  const username = useBookerStoreContext((state) => state.username);
  const isInstantMeeting = useBookerStoreContext((state) => state.isInstantMeeting);
  const isPlatformBookerEmbed = useIsPlatformBookerEmbed();
  const { timeFormat, timezone } = useBookerTime();

  const [responseVercelIdHeader] = useState<string | null>(null);
  const { t, i18n } = useLocale();

  const isPaidEvent = useMemo(() => {
    if (!eventType?.price) return false;
    const paymentAppData = getPaymentAppData(eventType);
    return eventType?.price > 0 && !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;
  }, [eventType]);

  const paymentCurrency = useMemo(() => {
    if (!eventType) return "USD";
    return getPaymentAppData(eventType)?.currency || "USD";
  }, [eventType]);

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isPending || !eventQuery.data) return <FormSkeleton />;
  if (!timeslot)
    return (
      <EmptyScreen
        headline={t("timeslot_missing_title")}
        description={t("timeslot_missing_description")}
        Icon="calendar"
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
        handleSubmit={onSubmit}
        noValidate>
        <BookingFields
          isDynamicGroupBooking={!!(username && username.indexOf("+") > -1)}
          fields={eventType.bookingFields}
          locations={eventType.locations}
          rescheduleUid={rescheduleUid || undefined}
          bookingData={bookingData}
          isPaidEvent={isPaidEvent}
          paymentCurrency={paymentCurrency}
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
                timeFormat,
                timezone,
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
                  ? t("reschedule")
                  : renderConfirmNotVerifyEmailButtonCond
                    ? isPaidEvent
                      ? t("pay_and_book")
                      : t("confirm")
                    : t("verify_email_button")}
              </Button>
            </>
          )}
        </div>
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
  let count = 0;

  if (error.message === ErrorCode.BookerLimitExceededReschedule) {
    const formattedDate = formatEventFromTime({
      date: error.data.startTime,
      timeFormat,
      timeZone: timezone,
      language,
    });
    date = `${formattedDate.date} ${formattedDate.time}`;
  }

  if (error.message === ErrorCode.BookerLimitExceeded && error.data?.count) {
    count = error.data.count;
  }

  const messageKey =
    error.message === ErrorCode.BookerLimitExceeded ? "booker_upcoming_limit_reached" : error.message;

  return error?.message ? (
    <>
      {responseVercelIdHeader ?? ""} {t(messageKey, { date, count })}
      {error.data?.traceId && (
        <div className="text-subtle mt-2 text-xs">
          <span className="font-medium">{t("trace_reference_id")}:</span>
          <code className="ml-1 select-all break-all font-mono">{error.data.traceId}</code>
        </div>
      )}
    </>
  ) : (
    <>{t("can_you_try_again")}</>
  );
};
