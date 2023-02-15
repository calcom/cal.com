import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import {
  useTimePreferences,
  mapBookingToMutationInput,
  validateCustomInputs,
  createBooking,
  createRecurringBooking,
  mapRecurringBookingToMutationInput,
} from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Form, TextField, EmailField, PhoneInput, Button, TextAreaField } from "@calcom/ui";
import { FiInfo, FiUserPlus } from "@calcom/ui/components/icon";

import { CustomInputFields } from "./CustomInputFields";
import { EventLocationsFields } from "./EventLocationsFields";
import { BookingFormValues, bookingFormSchema } from "./form-config";

type BookEventFormProps = {
  username: string;
  eventSlug: string;
  onCancel?: () => void;
  // Duration and recurring event count need to be passed in as a prop, since form does not use booker context,
  // so form can also be used outside of booker component.
  duration?: number | null;
  recurringEventCount?: number | null;
  timeslot?: string | null;
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

export const BookEventForm = ({
  username,
  eventSlug,
  onCancel,
  duration,
  timeslot,
  recurringEventCount,
}: BookEventFormProps) => {
  const router = useRouter();
  const { t, i18n } = useLocale();
  const { timezone } = useTimePreferences();
  const event = trpc.viewer.public.event.useQuery({ username, eventSlug }, { refetchOnWindowFocus: false });
  const defaultValues = () => {
    return {};
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
    resolver: zodResolver(bookingFormSchema), // Since this isn't set to strict we only validate the fields in the schema
  });
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

      // @TODO: add "formertime"
      return await router.push(
        getSuccessPath({ uid, email: bookingForm.getValues("email"), slug: eventSlug, isRecurring: false })
      );
    },
  });
  const createRecurringBookingMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData) => {
      const { uid } = responseData[0] || {};
      return await router.push(
        getSuccessPath({ uid, email: bookingForm.getValues("email"), slug: eventSlug, isRecurring: true })
      );
    },
  });

  // @TODO: Add reschedule layout.
  const disableInput = false;
  const guestToggle = false;
  const rescheduleUid = null;

  // @TODO: Loading and or error states.
  if (!event?.data) return null;
  if (!timeslot) return null;

  const bookEvent = (values: BookingFormValues) => {
    bookingForm.clearErrors();

    // @TODO: Shouldn't be possible, but do we want to warn for this?
    if (!event?.data) return;
    const errors = validateCustomInputs(event.data, values);
    // @TODO: Validate duration is valid option. + default to event.length if not passed in
    // @TODO: "validate that guests are unique" step

    if (errors) {
      errors.forEach((error) => bookingForm.setError(error.key, error.error));
      return;
    }

    const bookingInput = {
      values,
      duration,
      event: event.data,
      date: timeslot,
      timeZone: timezone,
      language: i18n.language,
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
        />

        <EmailField
          {...bookingForm.register("email")}
          label={t("email_address")}
          required
          placeholder="you@example.com"
          hintErrors={bookingForm.formState.errors.email && t("email_validation_error")}
        />

        <EventLocationsFields bookingForm={bookingForm} eventType={eventType} />
        <CustomInputFields bookingForm={bookingForm} inputs={eventType.customInputs} />

        {!eventType.disableGuests && guestToggle && (
          <div className="mb-4">
            {/* @TODO: Add in new guest fields */}
            {/* <div>
              <Label htmlFor="guests">{t("guests")}</Label>

              <Controller
                control={bookingForm.control}
                name="guests"
                render={({ field: { onChange, value } }) => (
                  <ReactMultiEmail
                    className="relative"
                    placeholder={<span className="dark:text-darkgray-600">guest@example.com</span>}
                    emails={value}
                    onChange={onChange}
                    getLabel={(email: string, index: number, removeEmail: (index: number) => void) => {
                      return (
                        <div data-tag key={index} className="cursor-pointer">
                          {email}
                          <span data-tag-handle onClick={() => removeEmail(index)}>
                            ×
                          </span>
                        </div>
                      );
                    }}
                  />
                )}
              />
            </div> */}
          </div>
        )}
        {/* @TODO: && selectedLocationType !== LocationType.Phone */}
        {eventType.isSmsReminderNumberNeeded && (
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

        <TextAreaField
          label={t("additional_notes")}
          {...bookingForm.register("notes")}
          required={!!eventType.metadata?.additionalNotesRequired}
          id="notes"
          name="notes"
          rows={3}
          placeholder={t("share_additional_notes")}
          // @TODO: How about this one during edit?
          // disabled={disabledExceptForOwner}
        />

        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          {!eventType.disableGuests && !guestToggle && (
            <Button
              type="button"
              color="minimal"
              variant="icon"
              tooltip={t("additional_guests")}
              StartIcon={FiUserPlus}
              // onClick={() => setGuestToggle(!guestToggle)}
              className="mr-auto"
            />
          )}
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
      {/* @TODO: Error */}
      {(createBookingMutation.isError || createRecurringBookingMutation.isError) && (
        <div>An error occured</div>
        // <div>{createBookingMutation?.error?.message || createRecurringBookingMutation?.error?.message}</div>
      )}
    </div>
  );
};
