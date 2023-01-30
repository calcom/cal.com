import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ReactMultiEmail } from "react-multi-email";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Form, TextField, Label, EmailField, PhoneInput, Button, TextAreaField } from "@calcom/ui";
import { FiInfo } from "@calcom/ui/components/icon";

import { CustomInputFields } from "./CustomInputFields";
import { EventLocationsFields } from "./EventLocationsFields";
import { BookingFormValues, bookingFormSchema } from "./form-config";

type BookEventFormProps = {
  username: string;
  eventSlug: string;
};

/**
 * @TODO: Full form HTML is copied from original /book page in order to break
 * as little as possible. I think we want to optimise this bit by bit later one as well.
 */
export const BookEventForm = ({ username, eventSlug }: BookEventFormProps) => {
  const { t } = useLocale();
  const event = trpc.viewer.public.event.useQuery({ username, eventSlug }, { refetchOnWindowFocus: false });

  const defaultValues = () => {
    return {};
  };

  // @TODO: Add reschedule layout.
  const disableInput = false;
  const guestToggle = false;
  const rescheduleUid = null;
  const bookEvent = () => {
    return {};
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
    resolver: zodResolver(bookingFormSchema), // Since this isn't set to strict we only validate the fields in the schema
  });

  // @TODO: Loading and or error states.
  if (!event?.data) return null;

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
            <div>
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
            </div>
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
          // @TODO: Types
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
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
              size="icon"
              tooltip={t("additional_guests")}
              StartIcon={Icon.FiUserPlus}
              // onClick={() => setGuestToggle(!guestToggle)}
              className="mr-auto"
            />
          )}
          <Button color="minimal" type="button">
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            // loading={mutation.isLoading || recurringMutation.isLoading}>
            data-testid={rescheduleUid ? "confirm-reschedule-button" : "confirm-book-button"}>
            {rescheduleUid ? t("reschedule") : t("confirm")}
          </Button>
        </div>
      </Form>
      {/* {(mutation.isError || recurringMutation.isError) && (
        <ErrorMessage error={mutation.error || recurringMutation.error} />
      )} */}
    </div>
  );
};
