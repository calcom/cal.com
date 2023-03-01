import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import type { FieldError } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { TFunction } from "react-i18next";

import { LocationType } from "@calcom/app-store/locations";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import dayjs from "@calcom/dayjs";
import {
  useTimePreferences,
  mapBookingToMutationInput,
  validateCustomInputs,
  validateUniqueGuests,
  createBooking,
  createRecurringBooking,
  mapRecurringBookingToMutationInput,
} from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { HttpError } from "@calcom/lib/http-error";
import {
  Form,
  TextField,
  EmailField,
  PhoneInput,
  Button,
  TextAreaField,
  Alert,
  EmptyScreen,
} from "@calcom/ui";
import { FiCalendar, FiInfo } from "@calcom/ui/components/icon";

import { useBookerStore } from "../../store";
import { useEvent } from "../../utils/event";
import { CustomInputFields } from "./CustomInputFields";
import { EventLocationsFields } from "./EventLocationsFields";
import { GuestFields } from "./GuestFields";
import { FormSkeleton } from "./Skeleton";
import type { BookingFormValues } from "./form-config";
import { bookingFormSchema } from "./form-config";

type BookEventFormProps = {
  onCancel?: () => void;
};

const getSuccessPath = ({
  uid,
  email,
  slug,
  formerTime,
  isRecurring,
}: {
  uid: string;
  email: string;
  slug: string;
  formerTime?: string;
  isRecurring: boolean;
}) => ({
  pathname: `/booking/${uid}`,
  query: {
    [isRecurring ? "allRemainingBookings" : "isSuccessBookingPage"]: true,
    email: email,
    eventTypeSlug: slug,
    formerTime: formerTime,
  },
});

export const BookEventForm = ({ onCancel }: BookEventFormProps) => {
  const router = useRouter();
  const { t, i18n } = useLocale();
  const { timezone } = useTimePreferences();
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const rescheduleBooking = useBookerStore((state) => state.rescheduleBooking);
  const eventSlug = useBookerStore((state) => state.eventSlug);
  const duration = useBookerStore((state) => state.selectedDuration);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const recurringEventCount = useBookerStore((state) => state.recurringEventCount);
  const isRescheduling = !!rescheduleUid && !!rescheduleBooking;
  const event = useEvent();

  const defaultValues = () => {
    if (isRescheduling) {
      return {
        email: rescheduleBooking?.attendees?.[0].email,
        name: rescheduleBooking?.attendees?.[0].name,
      };
    }
    return {};
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
    resolver: zodResolver(bookingFormSchema), // Since this isn't set to strict we only validate the fields in the schema
  });
  const locationType = bookingForm.watch("locationType");

  const createBookingMutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      const { uid, paymentUid } = responseData;
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date: timeslot,
            name: bookingForm.getValues("name"),
            email: bookingForm.getValues("email"),
            absolute: false,
          })
        );
      }

      return await router.push(
        getSuccessPath({
          uid,
          email: bookingForm.getValues("email"),
          formerTime: rescheduleBooking?.startTime
            ? dayjs(rescheduleBooking?.startTime).toISOString()
            : undefined,
          slug: `${eventSlug}`,
          isRecurring: false,
        })
      );
    },
  });

  const createRecurringBookingMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData) => {
      const { uid } = responseData[0] || {};
      return await router.push(
        getSuccessPath({
          uid,
          email: bookingForm.getValues("email"),
          slug: `${eventSlug}`,
          isRecurring: true,
        })
      );
    },
  });

  if (event.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (event.isLoading || !event.data) return <FormSkeleton />;
  if (!timeslot)
    return (
      <EmptyScreen
        headline={t("timeslot_missing_title")}
        description={t("timeslot_missing_description")}
        Icon={FiCalendar}
        buttonText={t("timeslot_missing_cta")}
        buttonOnClick={onCancel}
      />
    );

  const bookEvent = (values: BookingFormValues) => {
    bookingForm.clearErrors();

    // It shouldn't be possible that this method is fired without having event data,
    // but since in theory (looking at the types) it is possible, we still handle that case.
    if (!event?.data) {
      bookingForm.setError("globalError", { message: t("error_booking_event") });
      return;
    }

    const errors = validateCustomInputs(event.data, values);

    // Ensures that duration is an allowed value, if not it defaults to the
    // default event duration.
    const validDuration =
      duration &&
      event.data.metadata?.multipleDuration &&
      event.data.metadata?.multipleDuration.includes(duration)
        ? duration
        : event.data.length;

    const guestErrors = validateUniqueGuests(values.guests, values.email, t);

    if (errors) {
      errors.forEach((error) => bookingForm.setError(error.key, error.error));
      return;
    }

    if (guestErrors) {
      guestErrors.forEach((error) => bookingForm.setError(error.key, error.error));
      return;
    }

    const bookingInput = {
      values,
      duration: validDuration,
      event: event.data,
      date: timeslot,
      timeZone: timezone,
      language: i18n.language,
      rescheduleUid: rescheduleUid || undefined,
    };

    if (event.data?.recurringEvent?.freq && recurringEventCount) {
      createRecurringBookingMutation.mutate(
        mapRecurringBookingToMutationInput(bookingInput, recurringEventCount)
      );
    } else {
      createBookingMutation.mutate(mapBookingToMutationInput(bookingInput));
    }
  };

  const eventType = event.data;

  return (
    <div>
      <Form className="space-y-4" form={bookingForm} handleSubmit={bookEvent}>
        <TextField
          {...bookingForm.register("name", { required: true })}
          type="text"
          name="name"
          id="name"
          label={t("your_name")}
          required
          placeholder={t("example_name")}
          autoFocus
          disabled={isRescheduling}
        />

        <EmailField
          {...bookingForm.register("email")}
          label={t("email_address")}
          required
          placeholder="you@example.com"
          hintErrors={bookingForm.formState.errors.email && t("email_validation_error")}
          disabled={isRescheduling}
        />

        <EventLocationsFields bookingForm={bookingForm} eventType={eventType} />
        <CustomInputFields
          bookingForm={bookingForm}
          inputs={eventType.customInputs}
          isRescheduling={isRescheduling}
        />

        {!eventType.disableGuests && (
          <div className="mb-4">
            <GuestFields bookingForm={bookingForm} />
          </div>
        )}

        {locationType !== LocationType.Phone && eventType.isSmsReminderNumberNeeded && (
          <div className="mb-4">
            <label
              htmlFor="smsReminderNumber"
              className="block text-sm font-medium text-gray-700 dark:text-white">
              {t("number_sms_notifications")}
            </label>
            <div className="mt-1">
              <PhoneInput<BookingFormValues>
                control={bookingForm.control}
                name="smsReminderNumber"
                placeholder={t("enter_phone_number")}
                id="smsReminderNumber"
                required={eventType.isSmsReminderNumberRequired}
              />
            </div>
            {bookingForm.formState.errors.smsReminderNumber && (
              <div className="mt-2 flex items-center text-sm text-red-700 ">
                <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                <p>{t("invalid_number")}</p>
              </div>
            )}
          </div>
        )}

        {isRescheduling ? (
          <TextAreaField
            {...bookingForm.register("rescheduleReason")}
            id="rescheduleReason"
            name="rescheduleReason"
            placeholder={t("reschedule_placeholder")}
            label={t("reason_for_reschedule")}
            rows={3}
          />
        ) : (
          <TextAreaField
            label={t("additional_notes")}
            {...bookingForm.register("notes")}
            required={!!eventType.metadata?.additionalNotesRequired}
            id="notes"
            name="notes"
            rows={3}
            placeholder={t("share_additional_notes")}
          />
        )}

        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          {!!onCancel && (
            <Button color="minimal" type="button" onClick={onCancel}>
              {t("back")}
            </Button>
          )}
          <Button
            type="submit"
            loading={createBookingMutation.isLoading || createRecurringBookingMutation.isLoading}
            data-testid={rescheduleUid ? "confirm-reschedule-button" : "confirm-book-button"}>
            {rescheduleUid ? t("reschedule") : t("confirm")}
          </Button>
        </div>
      </Form>
      {(createBookingMutation.isError ||
        createRecurringBookingMutation.isError ||
        bookingForm.formState.errors["globalError"]) && (
        <div data-testid="booking-fail">
          <Alert
            className="mt-2"
            severity="warning"
            title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
            message={getError(
              bookingForm.formState.errors["globalError"],
              createBookingMutation,
              createRecurringBookingMutation,
              t
            )}
          />
        </div>
      )}
    </div>
  );
};

const getError = (
  globalError: FieldError | undefined,
  // It feels like an implementation detail to reimplement the types of useMutation here.
  // Since they don't matter for this function, I'd rather disable them then giving you
  // the cognitive overload of thinking to update them here when anything changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookingMutation: UseMutationResult<any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recurringBookingMutation: UseMutationResult<any, any, any, any>,
  t: TFunction
) => {
  if (globalError) return globalError.message;
  return bookingMutation.isError && (bookingMutation?.error as HttpError)?.message
    ? t((bookingMutation.error as HttpError).message)
    : recurringBookingMutation.isError && (recurringBookingMutation?.error as HttpError)?.message
    ? t((recurringBookingMutation.error as HttpError).message)
    : "Unknown error";
};
