import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInputType, WorkflowActions } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import { ReactMultiEmail } from "react-multi-email";
import { useMutation } from "react-query";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import dayjs from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { useContracts } from "@calcom/features/ee/web3/contexts/contractsContext";
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
import { LocationObject, LocationType } from "@lib/location";
import createBooking from "@lib/mutations/bookings/create-booking";
import createRecurringBooking from "@lib/mutations/bookings/create-recurring-booking";
import { parseDate, parseRecurringDates } from "@lib/parseDate";
import slugify from "@lib/slugify";

import AvatarGroup from "@components/ui/AvatarGroup";

import { BookPageProps } from "../../../pages/[user]/book";
import { HashLinkPageProps } from "../../../pages/d/[link]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

declare global {
  // eslint-disable-next-line no-var
  var web3: {
    currentProvider: {
      selectedAddress: string;
    };
  };
}

type BookingPageProps = (BookPageProps | TeamBookingPageProps | HashLinkPageProps) & {
  locationLabels: Record<LocationType, string>;
};

type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: LocationType;
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
  locationLabels,
  hasHashedBookingLink,
  hashedLink,
}: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const router = useRouter();
  const { contracts } = useContracts();
  const { data: session } = useSession();
  const isBackgroundTransparent = useIsBackgroundTransparent();
  const telemetry = useTelemetry();

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

  useEffect(() => {
    if (eventType.metadata.smartContractAddress) {
      const eventOwner = eventType.users[0];

      if (!contracts[(eventType.metadata.smartContractAddress || null) as number])
        router.replace(`/${eventOwner.username}`);
    }
  }, [contracts, eventType.metadata.smartContractAddress, eventType.users, router]);

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

      const location = (function humanReadableLocation(location) {
        if (!location) {
          return;
        }
        if (location.includes("integration")) {
          return t("web_conferencing_details_to_follow");
        }
        return location;
      })(responseData.location);

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
          location,
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

  const eventTypeDetail = { isWeb3Active: false, ...eventType };

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

  const locationInfo = (type: LocationType) => locations.find((location) => location.type === type);
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

  const selectedLocation = useWatch({
    control: bookingForm.control,
    name: "locationType",
    defaultValue: ((): LocationType | undefined => {
      if (router.query.location) {
        return router.query.location as LocationType;
      }
      if (locations.length === 1) {
        return locations[0]?.type;
      }
    })(),
  });

  const getLocationValue = (
    booking: Pick<BookingFormValues, "locationType" | "phone" | "hostPhoneNumber">
  ) => {
    const { locationType } = booking;
    switch (locationType) {
      case LocationType.Phone: {
        return booking.phone || "";
      }
      case LocationType.InPerson: {
        return locationInfo(locationType)?.address || "";
      }
      case LocationType.Link: {
        return locationInfo(locationType)?.link || "";
      }
      case LocationType.UserPhone: {
        return locationInfo(locationType)?.hostPhoneNumber || "";
      }
      case LocationType.Around: {
        return locationInfo(locationType)?.link || "";
      }
      case LocationType.Riverside: {
        return locationInfo(locationType)?.link || "";
      }
      case LocationType.Whereby: {
        return locationInfo(locationType)?.link || "";
      }
      case LocationType.Ping: {
        return locationInfo(locationType)?.link || "";
      }
      // Catches all other location types, such as Google Meet, Zoom etc.
      default:
        return selectedLocation || "";
    }
  };

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

    let web3Details: Record<"userWallet" | "userSignature", string> | undefined;
    if (eventTypeDetail.metadata.smartContractAddress) {
      web3Details = {
        userWallet: window.web3.currentProvider.selectedAddress,
        userSignature: contracts[(eventTypeDetail.metadata.smartContractAddress || null) as number],
      };
    }

    if (recurringDates.length) {
      // Identify set of bookings to one intance of recurring event to support batch changes
      const recurringEventId = uuidv4();
      const recurringBookings = recurringDates.map((recurringDate) => ({
        ...booking,
        web3Details,
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
        location: getLocationValue(
          booking.locationType ? booking : { ...booking, locationType: selectedLocation }
        ),
        metadata,
        customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
          label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
          value: booking.customInputs && inputId in booking.customInputs ? booking.customInputs[inputId] : "",
        })),
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          selectedLocation === LocationType.Phone ? booking.phone : booking.smsReminderNumber,
      }));
      recurringMutation.mutate(recurringBookings);
    } else {
      mutation.mutate({
        ...booking,
        web3Details,
        start: dayjs(date).format(),
        end: dayjs(date).add(eventType.length, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        bookingUid: router.query.bookingUid as string,
        user: router.query.user,
        location: getLocationValue(
          booking.locationType ? booking : { ...booking, locationType: selectedLocation }
        ),
        metadata,
        customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
          label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
          value: booking.customInputs && inputId in booking.customInputs ? booking.customInputs[inputId] : "",
        })),
        hasHashedBookingLink,
        hashedLink,
        smsReminderNumber:
          selectedLocation === LocationType.Phone ? booking.phone : booking.smsReminderNumber,
      });
    }
  };

  // Should be disabled when rescheduleUid is present and data was found in defaultUserValues name/email fields.
  const disableInput = !!rescheduleUid && !!defaultUserValues.email && !!defaultUserValues.name;
  const disabledExceptForOwner = disableInput && !loggedInIsOwner;
  const inputClassName =
    "focus:border-brand block w-full rounded-sm border-gray-300 focus:ring-black disabled:bg-gray-200 disabled:hover:cursor-not-allowed dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500 text-sm";

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

  return (
    <div>
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
            isBackgroundTransparent ? "" : "dark:border-1 bg-white dark:bg-gray-800",
            "rounded-md dark:border-gray-600 sm:border"
          )}>
          <div className="sm:flex">
            <div className="px-6 pt-6 pb-0 sm:w-1/2 sm:border-r sm:pb-6 sm:dark:border-gray-700">
              <AvatarGroup
                border="border-2 border-white dark:border-gray-800"
                size={14}
                items={[
                  { image: profile.image || "", alt: profile.name || "", title: profile.name || "" },
                ].concat(
                  eventType.users
                    .filter((user) => user.name !== profile.name)
                    .map((user) => ({
                      title: user.name || "",
                      image: user.avatar || "",
                      alt: user.name || "",
                    }))
                )}
              />
              <h2 className="font-cal text-bookinglight mt-2 font-medium dark:text-gray-300">
                {profile.name}
              </h2>
              <h1 className="text-bookingdark mb-4 text-xl font-semibold dark:text-white">
                {eventType.title}
              </h1>
              {!!eventType.seatsPerTimeSlot && (
                <p
                  className={`${
                    booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                      ? "text-rose-600"
                      : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                      ? "text-yellow-500"
                      : "text-emerald-400"
                  } mb-2`}>
                  {booking
                    ? eventType.seatsPerTimeSlot - booking.attendees.length
                    : eventType.seatsPerTimeSlot}{" "}
                  / {eventType.seatsPerTimeSlot} {t("seats_available")}
                </p>
              )}
              {eventType?.description && (
                <p className="text-bookinglight mb-2 text-sm dark:text-white">
                  <Icon.FiInfo className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                  {eventType.description}
                </p>
              )}
              {eventType?.requiresConfirmation && (
                <p className="text-bookinglight mb-2 text-sm dark:text-white">
                  <Icon.FiClipboard className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                  {t("requires_confirmation")}
                </p>
              )}
              <p className="text-bookinglight mb-2 text-sm dark:text-white">
                <Icon.FiClock className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                {eventType.length} {t("minutes")}
              </p>
              {eventType.price > 0 && (
                <p className="text-bookinglight mb-1 -ml-2 px-2 py-1 text-sm dark:text-white">
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
                <div className="mb-3 text-sm text-gray-600 dark:text-white">
                  <Icon.FiRefreshCw className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                  <p className="mb-1 -ml-2 inline px-2 py-1">
                    {getEveryFreqFor({
                      t,
                      recurringEvent: eventType.recurringEvent,
                      recurringCount: recurringEventCount,
                    })}
                  </p>
                </div>
              )}
              <div className="text-bookinghighlight mb-4 flex text-sm">
                <Icon.FiCalendar className="mr-[10px] ml-[2px] inline-block h-4 w-4" />
                <div className="-mt-1">
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
                        <p className="text-sm text-gray-600 dark:text-white">
                          {t("plus_more", { count: recurringStrings.length - 5 })}
                        </p>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
              {eventTypeDetail.isWeb3Active && eventType.metadata.smartContractAddress && (
                <p className="text-bookinglight mb-1 -ml-2 px-2 py-1">
                  {t("requires_ownership_of_a_token") + " " + eventType.metadata.smartContractAddress}
                </p>
              )}
              {booking?.startTime && rescheduleUid && (
                <div>
                  <p className="mt-8 mb-2 text-sm text-gray-600 dark:text-white" data-testid="former_time_p">
                    {t("former_time")}
                  </p>
                  <p className="text-gray-500 line-through dark:text-white">
                    <Icon.FiCalendar className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                    {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                  </p>
                </div>
              )}
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
                    {locations.map((location, i) => (
                      <label key={i} className="block">
                        <input
                          type="radio"
                          className="location h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                          {...bookingForm.register("locationType", { required: true })}
                          value={location.type}
                          defaultChecked={selectedLocation === location.type}
                        />
                        <span className="text-sm ltr:ml-2 rtl:mr-2 dark:text-gray-500">
                          {locationLabels[location.type]}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedLocation === LocationType.Phone && (
                  <div className="mb-4">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("phone_number")}
                    </label>
                    <div className="mt-1">
                      <PhoneInput<BookingFormValues>
                        control={bookingForm.control}
                        name="phone"
                        placeholder={t("enter_phone_number")}
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
                {isSmsReminderNumberNeeded && selectedLocation !== LocationType.Phone && (
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

                <div className="flex items-start space-x-2 rtl:space-x-reverse">
                  <Button
                    type="submit"
                    data-testid={rescheduleUid ? "confirm-reschedule-button" : "confirm-book-button"}
                    loading={mutation.isLoading || recurringMutation.isLoading}>
                    {rescheduleUid ? t("reschedule") : t("confirm")}
                  </Button>
                  <Button color="secondary" type="button" onClick={() => router.back()}>
                    {t("cancel")}
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
    </div>
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
