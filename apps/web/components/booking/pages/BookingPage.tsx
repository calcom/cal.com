import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInputType, WorkflowActions } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useReducer, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import { ReactMultiEmail } from "react-multi-email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import {
  EventLocationType,
  getEventLocationType,
  getEventLocationValue,
  getHumanReadableLocationValue,
  locationKeyToString,
} from "@calcom/app-store/locations";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import { LocationObject, LocationType } from "@calcom/core/location";
import dayjs from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedUiConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { APP_NAME } from "@calcom/lib/constants";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { HttpError } from "@calcom/lib/http-error";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { AddressInput, Button, EmailInput, Form, Icon, PhoneInput, Tooltip } from "@calcom/ui";
import { Group, RadioField } from "@calcom/ui";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { ensureArray } from "@lib/ensureArray";
import useRouterQuery from "@lib/hooks/useRouterQuery";
import createBooking from "@lib/mutations/bookings/create-booking";
import createRecurringBooking from "@lib/mutations/bookings/create-recurring-booking";
import { parseDate, parseRecurringDates } from "@lib/parseDate";
import slugify from "@lib/slugify";

import Gates, { Gate, GateState } from "@components/Gates";
import BookingDescription from "@components/booking/BookingDescription";

import { BookPageProps } from "../../../pages/[user]/book";
import { HashLinkPageProps } from "../../../pages/d/[link]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

type BookingPageProps = BookPageProps | TeamBookingPageProps | HashLinkPageProps;

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

const BookingPage = ({
  eventType,
  booking,
  profile,
  isDynamicGroupBooking,
  recurringEventCount,
  hasHashedBookingLink,
  hashedLink,
  ...restProps
}: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const { duration: queryDuration } = useRouterQuery("duration");
  const isEmbed = useIsEmbed(restProps.isEmbed);
  const embedUiConfig = useEmbedUiConfig();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const router = useRouter();
  const { data: session } = useSession();
  const isBackgroundTransparent = useIsBackgroundTransparent();
  const telemetry = useTelemetry();
  const [gateState, gateDispatcher] = useReducer(
    (state: GateState, newState: Partial<GateState>) => ({
      ...state,
      ...newState,
    }),
    {}
  );
  const stripeAppData = getStripeAppData(eventType);
  // Define duration now that we support multiple duration eventTypes
  let duration = eventType.length;
  if (queryDuration && !isNaN(Number(queryDuration))) {
    duration = Number(queryDuration);
  }

  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(
        telemetryEventTypes.embedView,
        collectPageParameters("/book", { isTeamBooking: document.URL.includes("team/") })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      const { uid, paymentUid } = responseData;
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name: bookingForm.getValues("name"),
            email: bookingForm.getValues("email"),
            absolute: false,
          })
        );
      }

      return router.push({
        pathname: `/booking/${uid}`,
        query: {
          isSuccessBookingPage: true,
          email: bookingForm.getValues("email"),
          eventTypeSlug: eventType.slug,
          formerTime: booking?.startTime.toString(),
        },
      });
    },
  });

  const recurringMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData = []) => {
      const { uid } = responseData[0] || {};

      return router.push({
        pathname: `/booking/${uid}`,
        query: {
          allRemainingBookings: true,
          email: bookingForm.getValues("email"),
          eventTypeSlug: eventType.slug,
          formerTime: booking?.startTime.toString(),
        },
      });
    },
  });

  const rescheduleUid = router.query.rescheduleUid as string;
  useTheme(profile.theme);
  const date = asStringOrNull(router.query.date);

  const [guestToggle, setGuestToggle] = useState(booking && booking.attendees.length > 1);
  // it would be nice if Prisma at some point in the future allowed for Json<Location>; as of now this is not the case.
  const locations: LocationObject[] = useMemo(
    () => (eventType.locations as LocationObject[]) || [],
    [eventType.locations]
  );

  useEffect(() => {
    if (router.query.guest) {
      setGuestToggle(true);
    }
  }, [router.query.guest]);

  const loggedInIsOwner = eventType?.users[0]?.id === session?.user?.id;
  const guestListEmails = !isDynamicGroupBooking
    ? booking?.attendees.slice(1).map((attendee) => attendee.email)
    : [];

  // There should only exists one default userData variable for primaryAttendee.
  const defaultUserValues = {
    email: rescheduleUid
      ? booking?.attendees[0].email
      : router.query.email
      ? (router.query.email as string)
      : "",
    name: rescheduleUid ? booking?.attendees[0].name : router.query.name ? (router.query.name as string) : "",
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

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
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

  // Calculate the booking date(s)
  let recurringStrings: string[] = [],
    recurringDates: Date[] = [];
  if (eventType.recurringEvent?.freq && recurringEventCount !== null) {
    [recurringStrings, recurringDates] = parseRecurringDates(
      {
        startDate: date,
        timeZone: timeZone(),
        recurringEvent: eventType.recurringEvent,
        recurringCount: parseInt(recurringEventCount.toString()),
      },
      i18n
    );
  }

  const bookEvent = (booking: BookingFormValues) => {
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

    if (recurringDates.length) {
      // Identify set of bookings to one intance of recurring event to support batch changes
      const recurringEventId = uuidv4();
      const recurringBookings = recurringDates.map((recurringDate) => ({
        ...booking,
        start: dayjs(recurringDate).format(),
        end: dayjs(recurringDate).add(duration, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        recurringEventId,
        // Added to track down the number of actual occurrences selected by the user
        recurringCount: recurringDates.length,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        user: router.query.user,
        location: getEventLocationValue(locations, {
          type: booking.locationType ? booking.locationType : selectedLocationType || "",
          phone: booking.phone,
          attendeeAddress: booking.attendeeAddress,
        }),
        metadata,
        customInputs: bookingCustomInputs,
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          selectedLocationType === LocationType.Phone
            ? booking.phone
            : booking.smsReminderNumber || undefined,
        ethSignature: gateState.rainbowToken,
      }));
      recurringMutation.mutate(recurringBookings);
    } else {
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
          type: (booking.locationType ? booking.locationType : selectedLocationType) || "",
          phone: booking.phone,
          attendeeAddress: booking.attendeeAddress,
        }),
        metadata,
        customInputs: bookingCustomInputs,
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          selectedLocationType === LocationType.Phone
            ? booking.phone
            : booking.smsReminderNumber || undefined,
        ethSignature: gateState.rainbowToken,
      });
    }
  };

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
  const showEventTypeDetails = (isEmbed && !embedUiConfig.hideEventTypeDetails) || !isEmbed;
  const rainbowAppData = getEventTypeAppData(eventType, "rainbow") || {};

  // Define conditional gates here
  const gates = [
    // Rainbow gate is only added if the event has both a `blockchainId` and a `smartContractAddress`
    rainbowAppData && rainbowAppData.blockchainId && rainbowAppData.smartContractAddress
      ? ("rainbow" as Gate)
      : undefined,
  ];

  return (
    <Gates gates={gates} appData={rainbowAppData} dispatch={gateDispatcher}>
      <Head>
        <title>
          {rescheduleUid
            ? t("booking_reschedule_confirmation", {
                eventTypeTitle: eventType.title,
                profileName: profile.name,
              })
            : t("booking_confirmation", {
                eventTypeTitle: eventType.title,
                profileName: profile.name,
              })}{" "}
          | {APP_NAME}
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BookingPageTagManager eventType={eventType} />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />
      <main
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "" : "sm:my-24",
          "my-0 max-w-3xl"
        )}>
        <div
          className={classNames(
            "main overflow-hidden",
            isBackgroundTransparent ? "" : "dark:border-1 dark:bg-darkgray-100 bg-white",
            "dark:border-darkgray-300 rounded-md sm:border"
          )}>
          <div className="sm:flex">
            {showEventTypeDetails && (
              <div className="sm:dark:border-darkgray-300 dark:text-darkgray-600 flex flex-col px-6 pt-6 pb-0 text-gray-600 sm:w-1/2 sm:border-r sm:pb-6">
                <BookingDescription isBookingPage profile={profile} eventType={eventType}>
                  {stripeAppData.price > 0 && (
                    <p className="text-bookinglight -ml-2 px-2 text-sm ">
                      <Icon.FiCreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                      <IntlProvider locale="en">
                        <FormattedNumber
                          value={stripeAppData.price / 100.0}
                          style="currency"
                          currency={stripeAppData.currency.toUpperCase()}
                        />
                      </IntlProvider>
                    </p>
                  )}
                  {!rescheduleUid && eventType.recurringEvent?.freq && recurringEventCount && (
                    <div className="items-start text-sm font-medium text-gray-600 dark:text-white">
                      <Icon.FiRefreshCw className="ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                      <p className="-ml-2 inline-block items-center px-2">
                        {getEveryFreqFor({
                          t,
                          recurringEvent: eventType.recurringEvent,
                          recurringCount: recurringEventCount,
                        })}
                      </p>
                    </div>
                  )}
                  <div className="text-bookinghighlight flex items-start text-sm">
                    <Icon.FiCalendar className="ml-[2px] mt-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                    <div className="text-sm font-medium">
                      {(rescheduleUid || !eventType.recurringEvent?.freq) && `${parseDate(date, i18n)}`}
                      {!rescheduleUid &&
                        eventType.recurringEvent?.freq &&
                        recurringStrings.slice(0, 5).map((timeFormatted, key) => {
                          return <p key={key}>{timeFormatted}</p>;
                        })}
                      {!rescheduleUid && eventType.recurringEvent?.freq && recurringStrings.length > 5 && (
                        <div className="flex">
                          <Tooltip
                            content={recurringStrings.slice(5).map((timeFormatted, key) => (
                              <p key={key}>{timeFormatted}</p>
                            ))}>
                            <p className="dark:text-darkgray-600 text-sm">
                              + {t("plus_more", { count: recurringStrings.length - 5 })}
                            </p>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                  {booking?.startTime && rescheduleUid && (
                    <div>
                      <p className="mt-8 mb-2 text-sm " data-testid="former_time_p">
                        {t("former_time")}
                      </p>
                      <p className="line-through ">
                        <Icon.FiCalendar className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                        {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                      </p>
                    </div>
                  )}
                  {!!eventType.seatsPerTimeSlot && (
                    <div className="text-bookinghighlight flex items-start text-sm">
                      <Icon.FiUser
                        className={`ml-[2px] mt-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px] ${
                          booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                            ? "text-rose-600"
                            : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                            ? "text-yellow-500"
                            : "text-bookinghighlight"
                        }`}
                      />
                      <p
                        className={`${
                          booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                            ? "text-rose-600"
                            : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                            ? "text-yellow-500"
                            : "text-bookinghighlight"
                        } mb-2 font-medium`}>
                        {booking
                          ? eventType.seatsPerTimeSlot - booking.attendees.length
                          : eventType.seatsPerTimeSlot}{" "}
                        / {eventType.seatsPerTimeSlot} {t("seats_available")}
                      </p>
                    </div>
                  )}
                </BookingDescription>
              </div>
            )}
            <div className={classNames("p-6", showEventTypeDetails ? "sm:w-1/2" : "w-full")}>
              <Form form={bookingForm} handleSubmit={bookEvent}>
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
                        <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                        <p>{t("email_validation_error")}</p>
                      </div>
                    )}
                  </div>
                </div>
                <>
                  {rescheduleUid ? (
                    <div className="mb-4">
                      <span className="block text-sm font-medium text-gray-700 dark:text-white">
                        {t("location")}
                      </span>
                      <p className="mt-1 text-sm text-gray-500">
                        {getHumanReadableLocationValue(booking?.location, t)}
                      </p>
                    </div>
                  ) : (
                    locations.length > 1 && (
                      <div className="mb-4">
                        <span className="block text-sm font-medium text-gray-700 dark:text-white">
                          {t("location")}
                        </span>
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
                        <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
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
                              <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
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
                      <label
                        htmlFor="guests"
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
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
                              getLabel={(
                                email: string,
                                index: number,
                                removeEmail: (index: number) => void
                              ) => {
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
                        <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                        <p>{t("invalid_number")}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-4">
                  <label
                    htmlFor="notes"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
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
                      size="icon"
                      tooltip={t("additional_guests")}
                      StartIcon={Icon.FiUserPlus}
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
                    loading={mutation.isLoading || recurringMutation.isLoading}>
                    {rescheduleUid ? t("reschedule") : t("confirm")}
                  </Button>
                </div>
              </Form>
              {(mutation.isError || recurringMutation.isError) && (
                <ErrorMessage error={mutation.error || recurringMutation.error} />
              )}
            </div>
          </div>
        </div>
      </main>
    </Gates>
  );
};

export default BookingPage;

function ErrorMessage({ error }: { error: unknown }) {
  const { t } = useLocale();
  const { query: { rescheduleUid } = {} } = useRouter();

  return (
    <div data-testid="booking-fail" className="mt-2 border-l-4 border-yellow-400 bg-yellow-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon.FiAlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ltr:ml-3 rtl:mr-3">
          <p className="text-sm text-yellow-700">
            {rescheduleUid ? t("reschedule_fail") : t("booking_fail")}{" "}
            {error instanceof HttpError || error instanceof Error ? t(error.message) : "Unknown error"}
          </p>
        </div>
      </div>
    </div>
  );
}
