import type {
  IUseBookingFormErrors,
  IUseBookingFormLoadingStates,
} from "bookings/Booker/components/hooks/useBookingForm";
import type { TFunction } from "next-i18next";
import { useEffect, useState } from "react";
import type { FieldError } from "react-hook-form";
import type { UseFormReturn, FieldValues } from "react-hook-form";

import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { Alert, Button, EmptyScreen, Form } from "@calcom/ui";
import { Calendar } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import type { useEventReturnType } from "../../utils/event";
import { BookingFields } from "./BookingFields";
import { FormSkeleton } from "./Skeleton";

type BookEventFormProps = {
  onCancel?: () => void;
  onSubmit: () => void;
  errorRef: React.RefObject<HTMLDivElement>;
  errors: IUseBookingFormErrors;
  loadingStates: IUseBookingFormLoadingStates;
  children?: React.ReactNode;
  bookingForm: UseFormReturn<FieldValues, any>;
  renderConfirmNotVerifyEmailButtonCond: boolean;
};

type BookEventContainerProps = {
  onReserveSlot: () => void;
  onRemoveSelectedSlot: () => void;
  event: useEventReturnType["data"];
  children?: React.ReactNode;
};

export const BookEventContainer = ({
  onReserveSlot,
  onRemoveSelectedSlot,
  event,
  children,
}: BookEventContainerProps) => {
  const timeslot = useBookerStore((state) => state.selectedTimeslot);

  useEffect(() => {
    onReserveSlot();

    const interval = setInterval(() => {
      onReserveSlot();
    }, parseInt(MINUTES_TO_BOOK) * 60 * 1000 - 2000);

    return () => {
      onRemoveSelectedSlot();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, timeslot]);

  return <div className="flex h-full flex-col">{children}</div>;
};

export const BookEventForm = ({
  onCancel,
  eventQuery,
  rescheduleUid,
  onSubmit,
  errorRef,
  errors,
  loadingStates,
  renderConfirmNotVerifyEmailButtonCond,
  bookingForm,
  children,
}: Omit<BookEventFormProps, "event"> & {
  eventQuery: useEventReturnType;
  rescheduleUid: string | null;
}) => {
  const eventType = eventQuery.data;
  const routerQuery = useRouterQuery();
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const bookingData = useBookerStore((state) => state.bookingData);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const username = useBookerStore((state) => state.username);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);

  const [responseVercelIdHeader, setResponseVercelIdHeader] = useState<string | null>(null);
  const { t } = useLocale();

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isLoading || !eventQuery.data) return <FormSkeleton />;
  if (!timeslot)
    return (
      <EmptyScreen
        headline={t("timeslot_missing_title")}
        description={t("timeslot_missing_description")}
        Icon={Calendar}
        buttonText={t("timeslot_missing_cta")}
        buttonOnClick={onCancel}
      />
    );

  if (!eventType) {
    console.warn("No event type found for event", routerQuery);
    return <Alert severity="warning" message={t("error_booking_event")} />;
  }

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
        />
        {errors.hasFormErrors && (
          <div data-testid="booking-fail">
            <Alert
              ref={errorRef}
              className="my-2"
              severity="info"
              title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
              message={getError(errors.formErrors, errors.dataErrors, t, responseVercelIdHeader)}
            />
          </div>
        )}
        <div className="modalsticky mt-auto flex justify-end space-x-2 rtl:space-x-reverse">
          {isInstantMeeting ? (
            <Button type="submit" color="primary" loading={loadingStates.creatingInstantBooking}>
              {t("confirm")}
            </Button>
          ) : (
            <>
              {!!onCancel && (
                <Button color="minimal" type="button" onClick={onCancel} data-testid="back">
                  {t("back")}
                </Button>
              )}
              <Button
                type="submit"
                color="primary"
                loading={loadingStates.creatingBooking || loadingStates.creatingRecurringBooking}
                data-testid={
                  rescheduleUid && bookingData ? "confirm-reschedule-button" : "confirm-book-button"
                }>
                {rescheduleUid && bookingData
                  ? t("reschedule")
                  : renderConfirmNotVerifyEmailButtonCond
                  ? t("confirm")
                  : t("verify_email_email_button")}
              </Button>
            </>
          )}
        </div>
      </Form>
      {children}
    </div>
  );
};

const getError = (
  globalError: FieldError | undefined,
  // It feels like an implementation detail to reimplement the types of useMutation here.
  // Since they don't matter for this function, I'd rather disable them then giving you
  // the cognitive overload of thinking to update them here when anything changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataError: any,
  t: TFunction,
  responseVercelIdHeader: string | null
) => {
  if (globalError) return globalError.message;

  const error = dataError;

  return error.message ? (
    <>
      {responseVercelIdHeader ?? ""} {t(error.message)}
    </>
  ) : (
    <>{t("can_you_try_again")}</>
  );
};
