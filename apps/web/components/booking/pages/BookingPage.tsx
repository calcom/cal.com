import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInputType, WorkflowActions } from "@prisma/client";
import { SchedulingType } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useReducer } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import { ReactMultiEmail } from "react-multi-email";
import { useMutation } from "react-query";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  locationKeyToString,
  getEventLocationValue,
  getEventLocationType,
  EventLocationType,
} from "@calcom/app-store/locations";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { LocationObject, LocationType } from "@calcom/core/location";
import dayjs from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { HttpError } from "@calcom/lib/http-error";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { Button } from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import { Tooltip } from "@calcom/ui/Tooltip";
import PhoneInput from "@calcom/ui/form/PhoneInputLazy";
import { EmailInput, Form } from "@calcom/ui/form/fields";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { ensureArray } from "@lib/ensureArray";
import createBooking from "@lib/mutations/bookings/create-booking";
import createRecurringBooking from "@lib/mutations/bookings/create-recurring-booking";
import { parseDate, parseRecurringDates } from "@lib/parseDate";
import slugify from "@lib/slugify";

import Gates, { Gate, GateState } from "@components/Gates";
import { UserAvatars } from "@components/booking/UserAvatars";
import EventTypeDescriptionSafeHTML from "@components/eventtype/EventTypeDescriptionSafeHTML";

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
}: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const isEmbed = useIsEmbed();
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
      const { id, attendees, paymentUid } = responseData;
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name: attendees[0].name,
            email: attendees[0].email,
            absolute: false,
          })
        );
      }

      return router.push({
        pathname: "/success",
        query: {
          date,
          type: eventType.id,
          eventSlug: eventType.slug,
          user: profile.slug,
          reschedule: !!rescheduleUid,
          name: attendees[0].name,
          email: attendees[0].email,
          location: responseData.location,
          eventName: profile.eventName || "",
          bookingId: id,
          isSuccessBookingPage: true,
        },
      });
    },
  });

  const recurringMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData = []) => {
      const { attendees = [], id, recurringEventId } = responseData[0] || {};
      const location = (function humanReadableLocation(location) {
        if (!location) {
          return;
        }
        if (location.includes("integration")) {
          return t("web_conferencing_details_to_follow");
        }
        return location;
      })(responseData[0].location);

      return router.push({
        pathname: "/success",
        query: {
          date,
          type: eventType.id,
          eventSlug: eventType.slug,
          recur: recurringEventId,
          user: profile.slug,
          reschedule: !!rescheduleUid,
          name: attendees[0].name,
          email: attendees[0].email,
          location,
          eventName: profile.eventName || "",
          bookingId: id,
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
    email: booking?.attendees[0].email
      ? booking.attendees[0].email
      : router.query.email
      ? (router.query.email as string)
      : "",
    name: booking?.attendees[0].name
      ? booking.attendees[0].name
      : router.query.name
      ? (router.query.name as string)
      : "",
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
      email: z.string().email(),
      phone: z
        .string()
        .refine((val) => isValidPhoneNumber(val))
        .optional(),
      smsReminderNumber: z
        .string()
        .refine((val) => isValidPhoneNumber(val))
        .optional(),
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
    selectedLocation?.attendeeInputType === "text"
      ? "input"
      : selectedLocation?.attendeeInputType === "phone"
      ? PhoneInput
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

    if (recurringDates.length) {
      // Identify set of bookings to one intance of recurring event to support batch changes
      const recurringEventId = uuidv4();
      const recurringBookings = recurringDates.map((recurringDate) => ({
        ...booking,
        start: dayjs(recurringDate).format(),
        end: dayjs(recurringDate).add(eventType.length, "minute").format(),
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
        }),
        metadata,
        customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
          label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
          value: booking.customInputs && inputId in booking.customInputs ? booking.customInputs[inputId] : "",
        })),
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          selectedLocationType === LocationType.Phone ? booking.phone : booking.smsReminderNumber,
        ethSignature: gateState.rainbowToken,
      }));
      recurringMutation.mutate(recurringBookings);
    } else {
      mutation.mutate({
        ...booking,
        start: dayjs(date).format(),
        end: dayjs(date).add(eventType.length, "minute").format(),
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
        }),
        metadata,
        customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
          label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
          value: booking.customInputs && inputId in booking.customInputs ? booking.customInputs[inputId] : "",
        })),
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          selectedLocationType === LocationType.Phone ? booking.phone : booking.smsReminderNumber,
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

  if (eventType.workflows.length > 0) {
    eventType.workflows.forEach((workflowReference) => {
      if (workflowReference.workflow.steps.length > 0) {
        workflowReference.workflow.steps.forEach((step) => {
          if (step.action === WorkflowActions.SMS_ATTENDEE) {
            isSmsReminderNumberNeeded = true;
            return;
          }
        });
      }
    });
  }

  // Define conditional gates here
  const gates = [
    // Rainbow gate is only added if the event has both a `blockchainId` and a `smartContractAddress`
    eventType.metadata && eventType.metadata.blockchainId && eventType.metadata.smartContractAddress
      ? ("rainbow" as Gate)
      : undefined,
  ];

  return (
    <Gates gates={gates} metadata={eventType.metadata} dispatch={gateDispatcher}>
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
          | Cal.com
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />
      <main
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "" : "sm:my-24",
          "my-0 max-w-3xl "
        )}>
        <div
          className={classNames(
            "main overflow-hidden",
            isEmbed ? "" : "border border-gray-200",
            isBackgroundTransparent ? "" : "dark:border-1 dark:bg-darkgray-100 bg-white",
            "dark:border-darkgray-300 rounded-md sm:border"
          )}>
          <div className="sm:flex">
            <div className="sm:dark:border-darkgray-300 dark:text-darkgray-600 flex flex-col px-6 pt-6 pb-0 text-gray-600 sm:w-1/2 sm:border-r sm:pb-6">
              <UserAvatars
                profile={profile}
                users={eventType.users}
                showMembers={eventType.schedulingType !== SchedulingType.ROUND_ROBIN}
                size={10}
                truncateAfter={3}
              />
              <h2 className="mt-2 break-words text-sm font-medium text-gray-500 dark:text-gray-300">
                {profile.name}
              </h2>
              <h1 className="font-cal dark:text-darkgray-900 break-words text-2xl text-gray-900 ">
                {eventType.title}
              </h1>
              <div className="mt-4 flex flex-col space-y-3 lg:mt-9">
                {eventType?.description && (
                  <div className="dark:text-darkgray-600 flex text-sm font-medium text-gray-600">
                    <div>
                      <Icon.FiInfo className="dark:text-darkgray-600 mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-500" />
                    </div>
                    <EventTypeDescriptionSafeHTML eventType={eventType} />
                  </div>
                )}
                {eventType?.requiresConfirmation && (
                  <div className="dark:text-darkgray-600 flex items-center text-sm font-medium text-gray-600">
                    <div>
                      <Icon.FiCheckSquare className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 " />
                    </div>
                    {t("requires_confirmation")}
                  </div>
                )}
                <p className="dark:text-darkgray-600 text-sm font-medium text-gray-600">
                  <Icon.FiClock className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4" />
                  {eventType.length} {t("minutes")}
                </p>
                {eventType.price > 0 && (
                  <p className="text-bookinglight -ml-2 px-2 text-sm ">
                    <Icon.FiCreditCard className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                    <IntlProvider locale="en">
                      <FormattedNumber
                        value={eventType.price / 100.0}
                        style="currency"
                        currency={eventType.currency.toUpperCase()}
                      />
                    </IntlProvider>
                  </p>
                )}
                {!rescheduleUid && eventType.recurringEvent?.freq && recurringEventCount && (
                  <div className="items-start text-sm font-medium text-gray-600 dark:text-white">
                    <Icon.FiRefreshCw className="mr-[10px] ml-[2px] inline-block h-4 w-4" />
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
                  <Icon.FiCalendar className="mr-[10px] ml-[2px] mt-[2px] inline-block h-4 w-4" />
                  <div className="text-sm font-medium">
                    {(rescheduleUid || !eventType.recurringEvent?.freq) &&
                      parseDate(dayjs(date).tz(timeZone()), i18n)}
                    {!rescheduleUid &&
                      eventType.recurringEvent?.freq &&
                      recurringStrings.slice(0, 5).map((aDate, key) => <p key={key}>{aDate}</p>)}
                    {!rescheduleUid && eventType.recurringEvent?.freq && recurringStrings.length > 5 && (
                      <div className="flex">
                        <Tooltip
                          content={recurringStrings.slice(5).map((aDate, key) => (
                            <p key={key}>{aDate}</p>
                          ))}>
                          <p className="dark:text-darkgray-600  text-sm">
                            {t("plus_more", { count: recurringStrings.length - 5 })}
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
                      <Icon.FiCalendar className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                      {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                    </p>
                  </div>
                )}
                {!!eventType.seatsPerTimeSlot && (
                  <div className="text-bookinghighlight flex items-start text-sm">
                    <Icon.FiUser className="mr-[10px] ml-[2px] mt-[2px] inline-block h-4 w-4" />
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
              </div>
            </div>
            <div className="p-6 sm:w-1/2">
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
                        bookingForm.formState.errors.email
                          ? "border-red-700 focus:ring-red-700"
                          : " border-gray-300  dark:border-gray-900"
                      )}
                      placeholder="you@example.com"
                      type="search" // Disables annoying 1password intrusive popup (non-optimal, I know I know...)
                      disabled={disableInput}
                    />
                    {bookingForm.formState.errors.email && (
                      <div className="mt-2 flex items-center text-sm text-red-700 ">
                        <Icon.FiInfo className="mr-2 h-3 w-3" />
                        <p>{t("email_validation_error")}</p>
                      </div>
                    )}
                  </div>
                </div>
                {locations.length > 1 && (
                  <div className="mb-4">
                    <span className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("location")}
                    </span>
                    {locations.map((location, i) => {
                      const locationString = locationKeyToString(location);
                      // TODO: Right now selectedLocationType isn't send by getSSP. Once that's available defaultChecked should work and show the location in the original booking
                      const defaultChecked = rescheduleUid ? selectedLocationType === location.type : i === 0;
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
                            defaultChecked={defaultChecked}
                          />
                          <span className="text-sm ltr:ml-2 rtl:mr-2 dark:text-white">
                            {locationKeyToString(location)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {/* TODO: Change name and id ="phone" to something generic */}
                {AttendeeInput && (
                  <div className="mb-4">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("phone_number")}
                    </label>
                    <div className="mt-1">
                      <AttendeeInput<BookingFormValues>
                        control={bookingForm.control}
                        name="phone"
                        placeholder={t(selectedLocation?.attendeeInputPlaceholder || "")}
                        id="phone"
                        required
                        disabled={disableInput}
                      />
                    </div>
                    {bookingForm.formState.errors.phone && (
                      <div className="mt-2 flex items-center text-sm text-red-700 ">
                        <Icon.FiInfo className="mr-2 h-3 w-3" />
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
                          className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                          {input.label}
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
                        <div className="flex h-5 items-center">
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
                            className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                            {input.label}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                {!eventType.disableGuests && (
                  <div className="mb-4">
                    {!guestToggle && (
                      <label
                        onClick={() => setGuestToggle(!guestToggle)}
                        htmlFor="guests"
                        className="mb-1 block text-sm font-medium hover:cursor-pointer dark:text-white">
                        {/*<UserAddIcon className="inline-block w-5 h-5 mr-1 -mt-1" />*/}
                        {t("additional_guests")}
                      </label>
                    )}
                    {guestToggle && (
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
                                placeholder="guest@example.com"
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
                    )}
                  </div>
                )}
                {isSmsReminderNumberNeeded && selectedLocationType !== LocationType.Phone && (
                  <div className="mb-4">
                    <label
                      htmlFor="smsReminderNumber"
                      className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("number_for_sms_reminders")}
                    </label>
                    <div className="mt-1">
                      <PhoneInput<BookingFormValues>
                        control={bookingForm.control}
                        name="smsReminderNumber"
                        placeholder={t("enter_phone_number")}
                        id="smsReminderNumber"
                        required
                        disabled={disableInput}
                      />
                    </div>
                    {bookingForm.formState.errors.smsReminderNumber && (
                      <div className="mt-2 flex items-center text-sm text-red-700 ">
                        <Icon.FiInfo className="mr-2 h-3 w-3" />
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
                  <Button
                    color="secondary"
                    type="button"
                    onClick={() => router.back()}
                    // We override this for this component only for now - as we don't support darkmode everywhere in the app
                    className="dark:border-none">
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="dark:bg-darkmodebrand dark:text-darkmodebrandcontrast rounded-md"
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
            {error instanceof HttpError || error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    </div>
  );
}
