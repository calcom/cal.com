import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInputType, WorkflowActions } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Controller, useForm, UseFormReturn, useWatch } from "react-hook-form";
import { ReactMultiEmail } from "react-multi-email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  EventLocationType,
  getEventLocationType,
  getEventLocationValue,
  getHumanReadableLocationValue,
  locationKeyToString,
} from "@calcom/app-store/locations";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { LocationObject, LocationType } from "@calcom/core/location";
import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { useEvent } from "@calcom/lib/hooks/useEvent";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { RouterOutputs } from "@calcom/trpc";
import {
  AddressInput,
  Button,
  EmailInput,
  Form,
  Group,
  PhoneInput,
  RadioField,
  SkeletonLoader,
} from "@calcom/ui";
import { FiInfo, FiUserPlus } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";
import { timeZone } from "@lib/clock";
import { ensureArray } from "@lib/ensureArray";
import { useBookingPageParams, useBookingPageQuery } from "@lib/hooks/useBookingPageQuery";
import createBooking from "@lib/mutations/bookings/create-booking";
import createRecurringBooking from "@lib/mutations/bookings/create-recurring-booking";
import slugify from "@lib/slugify";

import { useGateState } from "@components/Gates";

type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: EventLocationType["type"];
  guests?: string[];
  address?: string;
  attendeeAddress?: string;
  phone?: string;
  hostPhoneNumber?: string; // Maybe come up with a better way to name this to distingish between two types of phone numbers
  customInputs?: {
    [key: string]: string | boolean;
  };
  rescheduleReason?: string;
  smsReminderNumber?: string;
};

export const BookingFormLoader = () => {
  const query = useBookingPageQuery();
  return <QueryCell query={query} success={({ data }) => <BookingFormHandler {...data} />} />;
};

const BookingFormHandler = (props: Required<RouterOutputs["viewer"]["public"]["bookingPage"]>) => {
  const {
    eventType,
    booking,
    isDynamicGroupBooking,
    parsedRecurringDates,
    parsedRecurringEvent,
    duration,
    hasHashedBookingLink,
    hashedLink,
  } = props;
  // const [recurringStrings, recurringDates] = parsedRecurringDates;
  const router = useRouter();
  const { gateState } = useGateState();
  const { i18n } = useLocale();
  const { data: session } = useSession();
  const telemetry = useTelemetry();
  const {
    data: { rescheduleUid, email, name, date },
  } = useBookingPageParams();
  const loggedInIsOwner = eventType?.users[0]?.id === session?.user?.id;
  const guestListEmails = !isDynamicGroupBooking
    ? booking?.attendees.slice(1).map((attendee) => attendee.email)
    : [];

  // There should only exists one default userData variable for primaryAttendee.
  const defaultUserValues = {
    email: rescheduleUid ? booking?.attendees[0].email : email ? email : "",
    name: rescheduleUid ? booking?.attendees[0].name : name ? name : "",
  };

  const defaultValues = () => {
    if (!rescheduleUid) {
      return {
        name: defaultUserValues.name || (!loggedInIsOwner && session?.user?.name) || "",
        email: defaultUserValues.email || (!loggedInIsOwner && session?.user?.email) || "",
        notes: (router.query.notes as string) || "",
        guests: ensureArray(router.query.guest) as string[],
        customInputs: eventType.customInputs.reduce(
          (customInputs, input) => ({
            ...customInputs,
            [input.id]: router.query[slugify(input.label)],
          }),
          {}
        ),
      };
    }
    if (!booking || !booking.attendees.length) {
      return {};
    }
    const primaryAttendee = booking.attendees[0];
    if (!primaryAttendee) {
      return {};
    }

    const customInputType = booking.customInputs;
    return {
      name: defaultUserValues.name,
      email: defaultUserValues.email || "",
      guests: guestListEmails,
      notes: booking.description || "",
      rescheduleReason: "",
      smsReminderNumber: booking.smsReminderNumber || undefined,
      customInputs: eventType.customInputs.reduce(
        (customInputs, input) => ({
          ...customInputs,
          [input.id]: booking.customInputs
            ? booking.customInputs[input.label as keyof typeof customInputType]
            : "",
        }),
        {}
      ),
    };
  };

  const mutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      const {
        booking: { uid },
        paymentUid,
        name,
        email,
      } = responseData;
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name,
            email,
            absolute: false,
          })
        );
      }

      return router.push({
        pathname: `/booking/${uid}`,
        query: {
          isSuccessBookingPage: true,
          email,
          eventTypeSlug: eventType.slug,
          formerTime: booking?.startTime.toString(),
        },
      });
    },
  });

  const recurringMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData) => {
      const {
        bookings: {
          0: { uid },
        },
      } = responseData;

      return router.push({
        pathname: `/booking/${uid}`,
        query: {
          allRemainingBookings: true,
          email,
          eventTypeSlug: eventType.slug,
          formerTime: booking?.startTime.toString(),
        },
      });
    },
  });

  const onSubmit = useEvent<[BookingFormValues, UseFormReturn<BookingFormValues, unknown>], void>(
    async (booking, bookingForm) => {
      const bookingCustomInputs = Object.keys(booking.customInputs || {}).map((inputId) => ({
        label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
        value: booking.customInputs && booking.customInputs[inputId] ? booking.customInputs[inputId] : "",
      }));

      // Checking if custom inputs of type Phone number are valid to display error message on UI
      if (eventType.customInputs.length) {
        let isErrorFound = false;
        eventType.customInputs.forEach((customInput) => {
          if (customInput.required && customInput.type === EventTypeCustomInputType.PHONE) {
            const input = bookingCustomInputs.find((i) => i.label === customInput.label);
            try {
              z.string({
                errorMap: () => ({
                  message: `Missing ${customInput.type} customInput: '${customInput.label}'`,
                }),
              })
                .refine((val) => isValidPhoneNumber(val), {
                  message: "Phone number is invalid",
                })
                .parse(input?.value);
            } catch (err) {
              isErrorFound = true;
              bookingForm.setError(`customInputs.${customInput.id}`, {
                type: "custom",
                message: "Invalid Phone number",
              });
            }
          }
        });
        if (isErrorFound) return;
      }

      telemetry.event(
        top !== window ? telemetryEventTypes.embedBookingConfirmed : telemetryEventTypes.bookingConfirmed,
        { isTeamBooking: document.URL.includes("team/") }
      );
      // "metadata" is a reserved key to allow for connecting external users without relying on the email address.
      // <...url>&metadata[user_id]=123 will be send as a custom input field as the hidden type.

      // @TODO: move to metadata
      const metadata = Object.keys(router.query)
        .filter((key) => key.startsWith("metadata"))
        .reduce(
          (metadata, key) => ({
            ...metadata,
            [key.substring("metadata[".length, key.length - 1)]: router.query[key],
          }),
          {}
        );

      if (eventType.customInputs.length > 0) {
        // find all required custom inputs and ensure they are filled out in the booking form
        const requiredCustomInputs = eventType.customInputs.filter((input) => input.required);
        const missingRequiredCustomInputs = requiredCustomInputs.filter(
          (input) => !booking?.customInputs?.[input.id]
        );
        if (missingRequiredCustomInputs.length > 0) {
          missingRequiredCustomInputs.forEach((input) => {
            bookingForm.setError(`customInputs.${input.id}`, {
              type: "required",
            });
          });
          return;
        }
      }

      // if (recurringDates.length) {
      //   // Identify set of bookings to one intance of recurring event to support batch changes
      //   const recurringEventId = uuidv4();
      //   const recurringBookings = recurringDates.map((recurringDate) => ({
      //     ...booking,
      //     start: dayjs(recurringDate).format(),
      //     end: dayjs(recurringDate).add(duration, "minute").format(),
      //     eventTypeId: eventType.id,
      //     eventTypeSlug: eventType.slug,
      //     recurringEventId,
      //     // Added to track down the number of actual occurrences selected by the user
      //     recurringCount: recurringDates.length,
      //     timeZone: timeZone(),
      //     language: i18n.language,
      //     rescheduleUid,
      //     user: router.query.user,
      //     location: getEventLocationValue(eventType.locations as LocationObject[], {
      //       type: booking.locationType || "",
      //       phone: booking.phone,
      //       attendeeAddress: booking.attendeeAddress,
      //     }),
      //     metadata,
      //     customInputs: bookingCustomInputs,
      //     hasHashedBookingLink,
      //     hashedLink,
      //     smsReminderNumber:
      //       booking.locationType === LocationType.Phone
      //         ? booking.phone
      //         : booking.smsReminderNumber || undefined,
      //     ethSignature: gateState.rainbowToken,
      //   }));
      //   recurringMutation.mutate(recurringBookings);
      // } else {
      mutation.mutate({
        ...booking,
        start: dayjs(date).format(),
        end: dayjs(date).add(duration, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        bookingUid: router.query.bookingUid as string,
        user: router.query.user,
        location: getEventLocationValue(locations, {
          type: booking.locationType || "",
          phone: booking.phone,
          attendeeAddress: booking.attendeeAddress,
        }),
        metadata,
        customInputs: bookingCustomInputs,
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          booking.locationType === LocationType.Phone
            ? booking.phone
            : booking.smsReminderNumber || undefined,
        // ethSignature: gateState.rainbowToken,
      });
      // }
    }
  );

  return (
    <BookingForm
      onSubmit={onSubmit}
      defaultValues={defaultValues()}
      eventType={eventType}
      booking={booking}
      isDynamicGroupBooking={props.isDynamicGroupBooking}
    />
  );
};

const BookingForm = (props: {
  defaultValues: BookingFormValues;
  onSubmit: (values: BookingFormValues, bookingForm: UseFormReturn<BookingFormValues, any>) => void;
  eventType: RouterOutputs["viewer"]["public"]["bookingPage"]["eventType"];
  booking: RouterOutputs["viewer"]["public"]["bookingPage"]["booking"];
  isDynamicGroupBooking: boolean;
  isLoading?: boolean;
}) => {
  const { onSubmit, defaultValues, eventType, booking, isLoading, isDynamicGroupBooking } = props;
  const { t } = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const {
    data: { rescheduleUid, guest, email, name },
  } = useBookingPageParams();
  const [guestToggle, setGuestToggle] = useState(booking && booking.attendees.length > 1);
  // it would be nice if Prisma at some point in the future allowed for Json<Location>; as of now this is not the case.
  const locations = eventType.locations as LocationObject[];

  useEffect(() => {
    if (guest) {
      setGuestToggle(true);
    }
  }, [guest]);

  const loggedInIsOwner = eventType?.users[0]?.id === session?.user?.id;
  const guestListEmails = !isDynamicGroupBooking
    ? booking?.attendees.slice(1).map((attendee) => attendee.email)
    : [];

  // There should only exists one default userData variable for primaryAttendee.
  const defaultUserValues = {
    email: rescheduleUid ? booking?.attendees[0].email : email || "",
    name: rescheduleUid ? booking?.attendees[0].name : name || "",
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues,
    resolver: zodResolver(bookingFormSchema), // Since this isn't set to strict we only validate the fields in the schema
  });

  const selectedLocationType = useWatch({
    control: bookingForm.control,
    name: "locationType",
    defaultValue: ((): EventLocationType["type"] | undefined => {
      if (router.query.location) {
        return router.query.location as EventLocationType["type"];
      }
      if (locations.length === 1) {
        return locations[0]?.type;
      }
    })(),
  });

  const selectedLocation = getEventLocationType(selectedLocationType);
  const AttendeeInput =
    selectedLocation?.attendeeInputType === "phone"
      ? PhoneInput
      : selectedLocation?.attendeeInputType === "attendeeAddress"
      ? AddressInput
      : null;

  // Should be disabled when rescheduleUid is present and data was found in defaultUserValues name/email fields.
  const disableInput = !!rescheduleUid && !!defaultUserValues.email && !!defaultUserValues.name;
  const disableLocations = !!rescheduleUid;
  const disabledExceptForOwner = disableInput && !loggedInIsOwner;
  const inputClassName =
    "dark:placeholder:text-darkgray-600 focus:border-brand dark:border-darkgray-300 dark:text-darkgray-900 block w-full rounded-md border-gray-300 text-sm focus:ring-black disabled:bg-gray-200 disabled:hover:cursor-not-allowed dark:bg-transparent dark:selection:bg-green-500 disabled:dark:text-gray-500";

  let isSmsReminderNumberNeeded = false;
  let isSmsReminderNumberRequired = false;

  if (eventType.workflows.length > 0) {
    eventType.workflows.forEach((workflowReference) => {
      if (workflowReference.workflow.steps.length > 0) {
        workflowReference.workflow.steps.forEach((step) => {
          if (step.action === WorkflowActions.SMS_ATTENDEE) {
            isSmsReminderNumberNeeded = true;
            isSmsReminderNumberRequired = step.numberRequired || false;
            return;
          }
        });
      }
    });
  }

  return (
    <Form form={bookingForm} handleSubmit={async (v) => onSubmit(v, bookingForm)}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">
          {t("your_name")}
        </label>
        <div className="mt-1">
          <input
            {...bookingForm.register("name", { required: true })}
            type="text"
            name="name"
            id="name"
            required
            className={inputClassName}
            placeholder={t("example_name")}
            disabled={disableInput}
          />
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">
          {t("email_address")}
        </label>
        <div className="mt-1">
          <EmailInput
            {...bookingForm.register("email")}
            required
            className={classNames(
              inputClassName,
              bookingForm.formState.errors.email && "!focus:ring-red-700 !border-red-700"
            )}
            placeholder="you@example.com"
            type="search" // Disables annoying 1password intrusive popup (non-optimal, I know I know...)
            disabled={disableInput}
          />
          {bookingForm.formState.errors.email && (
            <div className="mt-2 flex items-center text-sm text-red-700 ">
              <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
              <p>{t("email_validation_error")}</p>
            </div>
          )}
        </div>
      </div>
      <>
        {rescheduleUid ? (
          <div className="mb-4">
            <span className="block text-sm font-medium text-gray-700 dark:text-white">{t("location")}</span>
            <p className="mt-1 text-sm text-gray-500">
              {getHumanReadableLocationValue(booking?.location, t)}
            </p>
          </div>
        ) : (
          locations.length > 1 && (
            <div className="mb-4">
              <span className="block text-sm font-medium text-gray-700 dark:text-white">{t("location")}</span>
              {locations.map((location, i) => {
                const locationString = locationKeyToString(location);
                if (!selectedLocationType) {
                  bookingForm.setValue("locationType", locations[0].type);
                }
                if (typeof locationString !== "string") {
                  // It's possible that location app got uninstalled
                  return null;
                }
                return (
                  <label key={i} className="block">
                    <input
                      type="radio"
                      disabled={!!disableLocations}
                      className="location dark:bg-darkgray-300 dark:border-darkgray-300 h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                      {...bookingForm.register("locationType", { required: true })}
                      value={location.type}
                      defaultChecked={i === 0}
                    />
                    <span className="text-sm ltr:ml-2 ltr:mr-2 rtl:ml-2 dark:text-white">
                      {t(locationKeyToString(location) ?? "")}
                    </span>
                  </label>
                );
              })}
            </div>
          )
        )}
      </>
      {/* TODO: Change name and id ="phone" to something generic */}
      {AttendeeInput && !disableInput && (
        <div className="mb-4">
          <label
            htmlFor={
              selectedLocationType === LocationType.Phone
                ? "phone"
                : selectedLocationType === LocationType.AttendeeInPerson
                ? "attendeeAddress"
                : ""
            }
            className="block text-sm font-medium text-gray-700 dark:text-white">
            {selectedLocationType === LocationType.Phone
              ? t("phone_number")
              : selectedLocationType === LocationType.AttendeeInPerson
              ? t("address")
              : ""}
          </label>
          <div className="mt-1">
            <AttendeeInput<BookingFormValues>
              control={bookingForm.control}
              bookingForm={bookingForm}
              name={
                selectedLocationType === LocationType.Phone
                  ? "phone"
                  : selectedLocationType === LocationType.AttendeeInPerson
                  ? "attendeeAddress"
                  : ""
              }
              placeholder={t(selectedLocation?.attendeeInputPlaceholder || "")}
              id={
                selectedLocationType === LocationType.Phone
                  ? "phone"
                  : selectedLocationType === LocationType.AttendeeInPerson
                  ? "attendeeAddress"
                  : ""
              }
              required
            />
          </div>
          {bookingForm.formState.errors.phone && (
            <div className="mt-2 flex items-center text-sm text-red-700 ">
              <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
              <p>{t("invalid_number")}</p>
            </div>
          )}
        </div>
      )}
      {eventType.customInputs
        .sort((a, b) => a.id - b.id)
        .map((input) => (
          <div className="mb-4" key={input.id}>
            {input.type !== EventTypeCustomInputType.BOOL && (
              <label
                htmlFor={"custom_" + input.id}
                className={classNames(
                  "mb-1 block text-sm font-medium text-gray-700 transition-colors dark:text-white",
                  bookingForm.formState.errors.customInputs?.[input.id] && "!text-red-700"
                )}>
                {input.label} {input.required && <span className="text-red-700">*</span>}
              </label>
            )}
            {input.type === EventTypeCustomInputType.TEXTLONG && (
              <textarea
                {...bookingForm.register(`customInputs.${input.id}`, {
                  required: input.required,
                })}
                required={input.required}
                id={"custom_" + input.id}
                rows={3}
                className={inputClassName}
                placeholder={input.placeholder}
                disabled={disabledExceptForOwner}
              />
            )}
            {input.type === EventTypeCustomInputType.TEXT && (
              <input
                type="text"
                {...bookingForm.register(`customInputs.${input.id}`, {
                  required: input.required,
                })}
                required={input.required}
                id={"custom_" + input.id}
                className={inputClassName}
                placeholder={input.placeholder}
                disabled={disabledExceptForOwner}
              />
            )}
            {input.type === EventTypeCustomInputType.NUMBER && (
              <input
                type="number"
                {...bookingForm.register(`customInputs.${input.id}`, {
                  required: input.required,
                })}
                required={input.required}
                id={"custom_" + input.id}
                className={inputClassName}
                placeholder=""
                disabled={disabledExceptForOwner}
              />
            )}
            {input.type === EventTypeCustomInputType.BOOL && (
              <div className="my-6">
                <div className="flex">
                  <input
                    type="checkbox"
                    {...bookingForm.register(`customInputs.${input.id}`, {
                      required: input.required,
                    })}
                    required={input.required}
                    id={"custom_" + input.id}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black disabled:bg-gray-200 ltr:mr-2 rtl:ml-2 disabled:dark:text-gray-500"
                    placeholder=""
                    disabled={disabledExceptForOwner}
                  />
                  <label
                    htmlFor={"custom_" + input.id}
                    className="-mt-px block text-sm font-medium text-gray-700 dark:text-white">
                    {input.label}
                  </label>
                </div>
              </div>
            )}
            {input.options && input.type === EventTypeCustomInputType.RADIO && (
              <div className="flex">
                <Group
                  name={`customInputs.${input.id}`}
                  required={input.required}
                  onValueChange={(e) => {
                    bookingForm.setValue(`customInputs.${input.id}`, e);
                  }}>
                  <>
                    {input.options.map((option, i) => (
                      <RadioField
                        label={option.label}
                        key={`option.${input.id}.${i}.radio`}
                        value={option.label}
                        id={`option.${input.id}.${i}.radio`}
                      />
                    ))}
                  </>
                  {bookingForm.formState.errors.customInputs?.[input.id] && (
                    <div className="mt-px flex items-center text-xs text-red-700 ">
                      <p>{t("required")}</p>
                    </div>
                  )}
                </Group>
              </div>
            )}
            {input.type === EventTypeCustomInputType.PHONE && (
              <div>
                <PhoneInput<BookingFormValues>
                  name={`customInputs.${input.id}`}
                  control={bookingForm.control}
                  placeholder={t("enter_phone_number")}
                  id={`customInputs.${input.id}`}
                  required={input.required}
                />
                {bookingForm.formState.errors?.customInputs?.[input.id] && (
                  <div className="mt-2 flex items-center text-sm text-red-700 ">
                    <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                    <p>{t("invalid_number")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      {!eventType.disableGuests && guestToggle && (
        <div className="mb-4">
          <div>
            <label htmlFor="guests" className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
              {t("guests")}
            </label>
            {!disableInput && (
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
                          {!disableInput && (
                            <span data-tag-handle onClick={() => removeEmail(index)}>
                              ×
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                )}
              />
            )}
            {/* Custom code when guest emails should not be editable */}
            {disableInput && guestListEmails && guestListEmails.length > 0 && (
              <div data-tag className="react-multi-email">
                {/* // @TODO: user owners are appearing as guest here when should be only user input */}
                {guestListEmails.map((email, index) => {
                  return (
                    <div key={index} className="cursor-pointer">
                      <span data-tag>{email}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {isSmsReminderNumberNeeded && selectedLocationType !== LocationType.Phone && (
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
              required={isSmsReminderNumberRequired}
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
      <div className="mb-4">
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
          {rescheduleUid ? t("reschedule_optional") : t("additional_notes")}
        </label>
        {rescheduleUid ? (
          <textarea
            {...bookingForm.register("rescheduleReason")}
            id="rescheduleReason"
            name="rescheduleReason"
            rows={3}
            className={inputClassName}
            placeholder={t("reschedule_placeholder")}
          />
        ) : (
          <textarea
            {...bookingForm.register("notes")}
            required={!!eventType.metadata?.additionalNotesRequired}
            id="notes"
            name="notes"
            rows={3}
            className={inputClassName}
            placeholder={t("share_additional_notes")}
            disabled={disabledExceptForOwner}
          />
        )}
      </div>

      <div className="flex justify-end space-x-2 rtl:space-x-reverse">
        {!eventType.disableGuests && !guestToggle && (
          <Button
            type="button"
            color="minimal"
            variant="icon"
            tooltip={t("additional_guests")}
            StartIcon={FiUserPlus}
            onClick={() => setGuestToggle(!guestToggle)}
            className="mr-auto"
          />
        )}
        <Button color="minimal" type="button" onClick={() => router.back()}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          data-testid={rescheduleUid ? "confirm-reschedule-button" : "confirm-book-button"}
          loading={isLoading}>
          {rescheduleUid ? t("reschedule") : t("confirm")}
        </Button>
      </div>
    </Form>
  );
};

const bookingFormSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().trim().email(),
    phone: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional()
      .nullable(),
    attendeeAddress: z.string().optional().nullable(),
    smsReminderNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional()
      .nullable(),
  })
  .passthrough();
